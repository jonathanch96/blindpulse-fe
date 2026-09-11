"use client"

import { CalendarRange, TrendingUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { benchmarkLabels, type Reveal } from "@/features/reveal/types"
import { formatSignedPercent, isNegative } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * The post-reveal header: what it was, when it was, and how the trader did against simply holding it.
 *
 * Sprint 04 is not built, so `strategyReturnPct` is 0 for every session and alpha is the negative of
 * the benchmark. That is arithmetically right for a session nobody traded, and it reads as a loss
 * unless the screen says otherwise — so it does, in the one case where it applies.
 */
export function RevealSummary({ reveal }: { reveal: Reveal }) {
  const untraded = reveal.strategyReturnPct === "0"

  return (
    <div className="space-y-4">
      <Card className="rounded-sm border-primary/40 bg-panel">
        <CardHeader>
          <CardDescription className="label-caps">Unblinded</CardDescription>
          <CardTitle className="metric text-3xl tracking-tight">{reveal.symbol}</CardTitle>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="metric">{reveal.timeframe} candles</span>
            <span className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden="true" />
              <span className="metric">
                {day(reveal.windowStart)} → {day(reveal.windowEnd)}
              </span>
            </span>
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Your return" value={reveal.strategyReturnPct} />
        <Metric label="Buy &amp; hold" value={reveal.benchmarkReturnPct} />
        <Metric label="Alpha" value={reveal.alphaPct} emphasis />
      </div>

      <p className="text-xs text-muted-foreground">
        {/* The comparison is stated, not assumed. "You beat the market" means nothing without saying
            which market and how it was measured, and a trader who disagrees should be able to read
            what the number was before arguing with it. */}
        Compared against {benchmarkLabels[reveal.benchmarkLabel] ?? reveal.benchmarkLabel}, entering at the first bar
        you could have traded.
        {untraded ? (
          <>
            {" "}
            <span className="text-foreground">
              You placed no trades in this session, so your return is zero and the alpha is simply what holding would
              have paid.
            </span>{" "}
            Execution arrives in Sprint 04.
          </>
        ) : null}
      </p>

      {reveal.macroLabel || reveal.macroNotes || reveal.macroTags.length > 0 ? (
        <Card className="rounded-sm border-seam bg-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="size-4 text-muted-foreground" aria-hidden="true" />
              {reveal.macroLabel ?? "Macro context"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {reveal.macroNotes ? <p className="text-sm leading-relaxed">{reveal.macroNotes}</p> : null}
            {reveal.macroTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {reveal.macroTags.map((tag) => (
                  <span key={tag} className="metric border border-seam px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function Metric({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="border border-seam bg-panel px-3 py-2">
      <p className="label-caps text-muted-foreground">{label}</p>
      {/* Colour is bound to the sign and to nothing else. A number that is green because it is the
          trader's own and red because it is the benchmark's would be editorial, not information. */}
      <p
        className={cn(
          "metric text-xl",
          emphasis ? "font-semibold" : "",
          isNegative(value) ? "text-bearish" : value === "0" ? "text-muted-foreground" : "text-bullish",
        )}
      >
        {formatSignedPercent(value)}
      </p>
    </div>
  )
}

// Date only. The window is disclosed, so this is allowed to exist — but the hour a candle opened is
// noise in a summary, and formatting it in the viewer's locale would make two traders comparing
// notes disagree about which day the session covered.
function day(value: string): string {
  return value.slice(0, 10)
}
