"use client"

import { ShieldAlert, ShieldCheck } from "lucide-react"

import type { RiskState } from "@/features/execution/types"
import { cn } from "@/lib/utils"

/**
 * The compliance readout (FR-RISK-05).
 *
 * It shows how much of the daily drawdown allowance is left as a fraction of that allowance, and
 * nothing about the window it is measured over — no reset time, no day ordinal, no countdown. That is
 * not an oversight to be tidied up later: a trader who could see where the resets fall would see a
 * two-day gap every five days, and that is a weekend, which rules out crypto outright and narrows
 * everything else (SP4-1). The server does not send it and this panel has nowhere to put it.
 */
export function RiskPanel({ risk }: { risk: RiskState | null | undefined }) {
  if (!risk) {
    return (
      <div className="border-b border-seam px-3 py-2">
        <p className="label-caps text-muted-foreground">Risk · reading</p>
      </div>
    )
  }

  const room = Number(risk.roomRemainingPct)
  // Three bands rather than a gradient: the trader needs to know which of "fine", "careful" and
  // "stop" they are in, and a continuously shifting colour communicates none of the three.
  const tone = risk.halted ? "bearish" : room <= 25 ? "caution" : "ok"

  return (
    <div className="space-y-2 border-b border-seam px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps text-muted-foreground">Risk</p>
        <span
          role="status"
          className={cn(
            "label-caps flex items-center gap-1.5 border px-1.5 py-0.5",
            tone === "bearish" && "border-bearish/40 text-bearish",
            tone === "caution" && "border-caution/40 text-caution",
            tone === "ok" && "border-primary/40 text-primary",
          )}
        >
          {risk.halted ? (
            <ShieldAlert className="size-3" aria-hidden="true" />
          ) : (
            <ShieldCheck className="size-3" aria-hidden="true" />
          )}
          {risk.halted ? "Gate closed" : "Gate open"}
        </span>
      </div>

      {/* The bar is decorative; the percentage beside it carries the same information, so the state
          survives without the colour. */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="label-caps text-muted-foreground">Daily allowance left</span>
          <span className="metric text-[13px] font-semibold">{room.toFixed(1)}%</span>
        </div>
        <div className="mt-1 h-1 w-full bg-panel-raised" aria-hidden="true">
          <div
            className={cn(
              "h-full transition-[width]",
              tone === "bearish" && "bg-bearish",
              tone === "caution" && "bg-caution",
              tone === "ok" && "bg-primary",
            )}
            style={{ width: `${Math.max(0, Math.min(100, room))}%` }}
          />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
        <Figure label="Equity" value={risk.equity} />
        <Figure label="Balance" value={risk.balance} />
        <Figure label="Margin used" value={risk.committedMargin} />
        <Figure label="Open" value={String(risk.openPositions)} />
      </dl>

      {risk.halted ? (
        <p className="text-[11px] leading-snug text-bearish">
          The daily drawdown gate has closed and your positions were flattened. New orders are refused
          until the allowance resets. The session stays open — the post-mortem needs it.
        </p>
      ) : null}
    </div>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="label-caps text-muted-foreground">{label}</dt>
      {/* The string the server sent, rendered as-is. Reformatting a decimal through a float is how a
          balance picks up a digit nobody chose. */}
      <dd className="metric text-[12px]">{value}</dd>
    </div>
  )
}
