"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { previewSizing } from "@/features/execution/sizing"
import type { OrderType, RiskState, Side } from "@/features/execution/types"
import { orderTypes } from "@/features/execution/types"
import { cn } from "@/lib/utils"

type Submission = {
  side: Side
  type: OrderType
  stopLoss: string
  takeProfit?: string
  limitPrice?: string
  quantity?: string
  riskPct?: string
}

/**
 * The order ticket (FR-EXEC-01 … FR-EXEC-04).
 *
 * Two things about its shape are deliberate.
 *
 * The stop field has no empty state that submits. BR-03 is that no entry exists without a hard stop,
 * and the server refuses a stopless order against a NOT NULL column — so a ticket that could express
 * one would be a ticket whose only purpose was to be rejected. The button stays disabled instead, and
 * says why.
 *
 * Size is entered as a risk percentage by default rather than a quantity. Those are alternatives, not
 * a primary and a fallback — the server refuses both together rather than picking one — and risk is
 * the default because it is the habit the product exists to build. A trader who types "1%" has made a
 * decision about their account; one who types "250" has made a decision about a number.
 *
 * Nothing here decides whether the order is allowed. The preview is a preview; the gate is on the
 * server (BR-04), because a gate in the browser is advice that a hand-rolled request walks past.
 */
export function OrderTicket({
  lastPrice,
  risk,
  disabled,
  pending,
  onSubmit,
}: {
  /** The last price the trader has been shown. The fill is the *next* bar's open, which does not exist yet. */
  lastPrice: string | null
  risk: RiskState | null | undefined
  disabled: boolean
  pending: boolean
  onSubmit: (submission: Submission) => void
}) {
  const [side, setSide] = useState<Side>("buy")
  const [type, setType] = useState<OrderType>("market")
  const [sizeMode, setSizeMode] = useState<"risk" | "quantity">("risk")
  const [riskPct, setRiskPct] = useState("1")
  const [quantity, setQuantity] = useState("")
  const [limitPrice, setLimitPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")

  // A resting order is priced where it waits; a market order is priced from the last bar the trader
  // saw. Either way this is the reference the *preview* uses, and not the fill: the fill is the next
  // bar's open, plus the spread, plus slippage, and it has not happened yet.
  const reference = type === "market" ? lastPrice : limitPrice || lastPrice

  const preview = useMemo(() => {
    if (!reference || !stopLoss) return null
    return previewSizing({
      side,
      entry: Number(reference),
      stopLoss: Number(stopLoss),
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      equity: Number(risk?.equity ?? 0),
      quantity: sizeMode === "quantity" && quantity ? Number(quantity) : undefined,
      riskPct: sizeMode === "risk" && riskPct ? Number(riskPct) : undefined,
    })
  }, [side, reference, stopLoss, takeProfit, risk?.equity, sizeMode, quantity, riskPct])

  const blocker = useMemo(() => {
    if (risk?.halted) return "The daily drawdown gate is closed."
    if (!stopLoss) return "Set a stop. No entry without one."
    if (type !== "market" && !limitPrice) return "A resting order needs the price it waits at."
    if (sizeMode === "risk" && !riskPct) return "Set the risk for this trade."
    if (sizeMode === "quantity" && !quantity) return "Set a size."
    if (!preview) return "Those levels do not describe a trade."
    return null
  }, [risk?.halted, stopLoss, type, limitPrice, sizeMode, riskPct, quantity, preview])

  function submit() {
    if (blocker || disabled) return
    onSubmit({
      side,
      type,
      stopLoss,
      takeProfit: takeProfit || undefined,
      limitPrice: type === "market" ? undefined : limitPrice,
      // Exactly one of these, matching the server. Sending both is refused rather than resolved by
      // precedence, so the ticket must not hedge by sending the one it is not using.
      quantity: sizeMode === "quantity" ? quantity : undefined,
      riskPct: sizeMode === "risk" ? riskPct : undefined,
    })
  }

  return (
    <div className="space-y-2 border-b border-seam px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps text-muted-foreground">Order</p>
        {lastPrice ? <span className="metric text-[11px] text-muted-foreground">last {lastPrice}</span> : null}
      </div>

      <div className="flex items-center gap-px" role="group" aria-label="Side">
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSide(value)}
            aria-pressed={side === value}
            disabled={disabled}
            className={cn(
              "label-caps flex-1 border border-seam px-2 py-1.5 disabled:opacity-50",
              side === value
                ? value === "buy"
                  ? "border-bullish bg-bullish text-bullish-foreground"
                  : "border-bearish bg-bearish text-bearish-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "buy" ? "Long" : "Short"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-px" role="group" aria-label="Order type">
        {orderTypes.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setType(value)}
            aria-pressed={type === value}
            disabled={disabled}
            className={cn(
              "metric flex-1 border border-seam px-2 py-1 text-xs disabled:opacity-50",
              type === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      {type === "market" ? null : (
        <Field label="Limit price" value={limitPrice} onChange={setLimitPrice} disabled={disabled} placeholder="where it waits" />
      )}

      <div className="flex items-center gap-px" role="group" aria-label="Sizing method">
        {(["risk", "quantity"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSizeMode(value)}
            aria-pressed={sizeMode === value}
            disabled={disabled}
            className={cn(
              "label-caps flex-1 border border-seam px-2 py-1 disabled:opacity-50",
              sizeMode === value ? "bg-panel-raised text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "risk" ? "Risk %" : "Size"}
          </button>
        ))}
      </div>

      {sizeMode === "risk" ? (
        <Field label="Risk of equity" value={riskPct} onChange={setRiskPct} disabled={disabled} suffix="%" />
      ) : (
        <Field label="Quantity" value={quantity} onChange={setQuantity} disabled={disabled} />
      )}

      {/* Stop first, above the target. The order of the fields is the order of the decision: where
          you are wrong is the question that sizes the trade, and where you are right is the one that
          justifies taking it. */}
      <Field label="Stop loss" value={stopLoss} onChange={setStopLoss} disabled={disabled} required placeholder="required" />
      <Field label="Take profit" value={takeProfit} onChange={setTakeProfit} disabled={disabled} placeholder="optional" />

      {preview ? (
        <dl className="space-y-0.5 border border-seam bg-panel-raised px-2 py-1.5">
          <Readout label="At risk" value={`${preview.riskAmount.toFixed(2)} (${preview.riskPct.toFixed(2)}%)`} />
          {preview.quantity === undefined ? null : <Readout label="Size" value={preview.quantity.toFixed(5)} />}
          <Readout label="Stop distance" value={preview.stopDistance.toFixed(5)} />
          <Readout
            label="Reward : risk"
            value={preview.riskReward === undefined ? "—" : `${preview.riskReward.toFixed(2)} : 1`}
          />
          <p className="pt-1 text-[10px] leading-snug text-muted-foreground">
            A preview. The fill is the next bar&apos;s open plus spread and slippage, and your account&apos;s
            own rules are applied by the server.
          </p>
        </dl>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="h-8 w-full rounded-sm"
        onClick={submit}
        disabled={disabled || pending || blocker !== null}
      >
        <span className="label-caps">
          {pending ? "Submitting" : `${side === "buy" ? "Buy" : "Sell"} ${type}`}
        </span>
      </Button>
      {blocker ? (
        <p className="text-[11px] leading-snug text-muted-foreground" role="status">
          {blocker}
        </p>
      ) : null}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
  suffix,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  placeholder?: string
  suffix?: string
  required?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="label-caps shrink-0 text-muted-foreground">
        {label}
        {required ? <span className="text-bearish"> *</span> : null}
      </span>
      <span className="flex items-center gap-1">
        <Input
          // inputMode decimal rather than type=number: a number input silently drops a trailing
          // decimal point mid-typing and offers spinners nobody wants on a price.
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="metric h-7 w-28 rounded-sm px-2 text-right text-[12px]"
        />
        {suffix ? <span className="metric text-[11px] text-muted-foreground">{suffix}</span> : null}
      </span>
    </label>
  )
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      <dd className="metric text-[12px]">{value}</dd>
    </div>
  )
}
