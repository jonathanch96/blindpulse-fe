"use client"

import { Ban, Minimize2, MoveHorizontal, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { heatAgainstStop } from "@/features/execution/sizing"
import { rejectionReasons, type Order, type Trade } from "@/features/execution/types"
import { cn } from "@/lib/utils"

/**
 * Open positions, with the actions that manage them (FR-EXEC-05 … FR-EXEC-07).
 *
 * Breakeven is its own button rather than a stop field pre-filled with the entry price, because the
 * two are the same arithmetic and different decisions — and the one the discipline index wants to
 * recognize is the one taken on purpose. After it, the position's 1R is unchanged: the R-multiple is
 * measured against the stop the position was *sized* on, which is why `initialStopLoss` is shown
 * beside the live one rather than replaced by it.
 */
export function PositionList({
  positions,
  busyTradeId,
  disabled,
  onBreakeven,
  onClose,
  onAmend,
}: {
  positions: Trade[]
  busyTradeId: string | null
  disabled: boolean
  onBreakeven: (tradeId: string) => void
  onClose: (tradeId: string, fraction?: string) => void
  onAmend: (tradeId: string, levels: { stopLoss?: string; takeProfit?: string }) => void
}) {
  if (positions.length === 0) {
    return (
      <p className="px-3 py-2 text-[11px] text-muted-foreground">
        Nothing open. A session with no positions is a legitimate outcome — sitting out a setup you
        did not like is a decision the post-mortem will count.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-seam">
      {positions.map((position) => (
        <PositionRow
          key={position.id}
          position={position}
          busy={busyTradeId === position.id || disabled}
          onBreakeven={() => onBreakeven(position.id)}
          onClose={(fraction) => onClose(position.id, fraction)}
          onAmend={(levels) => onAmend(position.id, levels)}
        />
      ))}
    </ul>
  )
}

function PositionRow({
  position,
  busy,
  onBreakeven,
  onClose,
  onAmend,
}: {
  position: Trade
  busy: boolean
  onBreakeven: () => void
  onClose: (fraction?: string) => void
  onAmend: (levels: { stopLoss?: string; takeProfit?: string }) => void
}) {
  // The editor is seeded when it *opens*, not when the row mounts, and the difference is a real bug
  // this shape once had. Initialising from the prop with useState captures the levels as they were the
  // first time the row rendered, and never resyncs — so after a breakeven, opening the editor and
  // touching only the target sent the *pre-breakeven* stop back, silently undoing the one action the
  // discipline index most wants to reward. `draft` is null while closed, which makes "not editing"
  // and "editing stale values" different states rather than the same one.
  const [draft, setDraft] = useState<{ stopLoss: string; takeProfit: string } | null>(null)

  const long = position.side === "buy"
  const atBreakeven = position.stopLoss === position.entryPrice
  const heat = heatAgainstStop(position.maxAdverseExcursion, position.entryPrice, position.initialStopLoss)

  return (
    <li className="space-y-1.5 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn("label-caps", long ? "text-bullish" : "text-bearish")}>
          {long ? "Long" : "Short"} {position.quantity}
        </span>
        <span className="metric text-[11px] text-muted-foreground">@ {position.entryPrice}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3">
        <Cell label="Stop" value={atBreakeven ? `${position.stopLoss} · breakeven` : position.stopLoss} />
        <Cell label="Target" value={position.takeProfit ?? "—"} />
        {/* 1R, shown because it does not move when the stop does. Without it, a position at breakeven
            looks like one risking nothing, and its R-multiple looks like it came from nowhere. */}
        <Cell label="1R from" value={position.initialStopLoss} />
        <Cell label="Heat" value={heat === null ? "—" : `${heat.toFixed(2)}R against`} />
      </dl>

      {draft ? (
        <div className="space-y-1 border border-seam bg-panel-raised p-1.5">
          <LevelField
            label="Stop"
            value={draft.stopLoss}
            onChange={(value) => setDraft({ ...draft, stopLoss: value })}
            disabled={busy}
          />
          <LevelField
            label="Target"
            value={draft.takeProfit}
            onChange={(value) => setDraft({ ...draft, takeProfit: value })}
            disabled={busy}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-6 flex-1 rounded-sm"
              disabled={busy}
              onClick={() => {
                // Only the levels that actually changed are sent, compared against the position as it
                // is *now*. Re-asserting an unchanged stop would re-assert one sitting at breakeven,
                // which the server validates only when it is named — and that is precisely what keeps
                // breakeven from being a one-way door.
                const levels: { stopLoss?: string; takeProfit?: string } = {}
                if (draft.stopLoss && draft.stopLoss !== position.stopLoss) levels.stopLoss = draft.stopLoss
                if (draft.takeProfit !== (position.takeProfit ?? "")) {
                  levels.takeProfit = draft.takeProfit || undefined
                }
                setDraft(null)
                if (levels.stopLoss === undefined && levels.takeProfit === undefined) return
                onAmend(levels)
              }}
            >
              <span className="label-caps">Move</span>
            </Button>
            <Button size="sm" variant="outline" className="h-6 rounded-sm" onClick={() => setDraft(null)}>
              <span className="label-caps">Cancel</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <Action label="Breakeven" icon={Minimize2} disabled={busy || atBreakeven} onClick={onBreakeven} />
          <Action
            label="Levels"
            icon={MoveHorizontal}
            disabled={busy}
            onClick={() => setDraft({ stopLoss: position.stopLoss, takeProfit: position.takeProfit ?? "" })}
          />
          <Action label="Half" disabled={busy} onClick={() => onClose("0.5")} />
          <Action label="Close" icon={X} disabled={busy} onClick={() => onClose()} />
        </div>
      )}
    </li>
  )
}

/**
 * The order log, rejections included.
 *
 * A refused order is shown rather than hidden, because it is a row on the server for the same reason
 * (BR-09): what the trader *tried* to do is the discipline index's richest input, and a log that
 * quietly dropped the refusals would teach nobody anything about the orders their own rules stopped.
 */
export function OrderList({
  orders,
  busyOrderId,
  disabled,
  onCancel,
}: {
  orders: Order[]
  busyOrderId: string | null
  disabled: boolean
  onCancel: (orderId: string) => void
}) {
  if (orders.length === 0) {
    return <p className="px-3 py-2 text-[11px] text-muted-foreground">No orders yet.</p>
  }
  return (
    <ul className="divide-y divide-seam">
      {orders.map((order) => {
        const refused = order.status === "rejected"
        return (
          <li key={order.id} className="space-y-0.5 px-3 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "label-caps",
                  refused ? "text-bearish" : order.side === "buy" ? "text-bullish" : "text-bearish",
                )}
              >
                {refused ? <Ban className="mr-1 inline size-3" aria-hidden="true" /> : null}
                {order.side} {order.type} {order.quantity}
              </span>
              {/* An index, never a time. The bar the trader was on when they pressed the button. */}
              <span className="metric text-[10px] text-muted-foreground">bar {order.placedBarIndex + 1}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="metric text-[11px] text-muted-foreground">
                {order.status}
                {order.filledPrice ? ` @ ${order.filledPrice}` : ""}
                {order.riskAmount ? ` · risked ${order.riskAmount}` : ""}
              </span>
              {order.status === "pending" ? (
                <button
                  type="button"
                  className="label-caps text-muted-foreground hover:text-foreground disabled:opacity-50"
                  disabled={disabled || busyOrderId === order.id}
                  onClick={() => onCancel(order.id)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
            {order.rejectionCode ? (
              <p className="text-[10px] leading-snug text-bearish">
                {rejectionReasons[order.rejectionCode] ?? order.rejectionCode}
              </p>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric text-[11px]">{value}</dd>
    </div>
  )
}

function LevelField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="label-caps text-muted-foreground">{label}</span>
      <Input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="metric h-6 w-24 rounded-sm px-1.5 text-right text-[11px]"
      />
    </label>
  )
}

function Action({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon?: typeof X
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Button size="sm" variant="outline" className="h-6 gap-1 rounded-sm px-2" disabled={disabled} onClick={onClick}>
      {Icon ? <Icon className="size-3" aria-hidden="true" /> : null}
      <span className="label-caps">{label}</span>
    </Button>
  )
}
