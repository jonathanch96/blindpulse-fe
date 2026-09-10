import { EyeOff } from "lucide-react"

// Says out loud that information is being withheld on purpose. Without this the masking reads as
// missing data — a trader who thinks the ticker failed to load behaves differently from one who
// knows it is hidden, and only the second one is doing the exercise.
export function BlindingNotice() {
  return (
    <aside className="flex gap-3 border border-seam bg-panel-raised p-3">
      <EyeOff className="mt-0.5 size-4 shrink-0 text-telemetry" aria-hidden="true" />
      <div className="space-y-1">
        <p className="label-caps text-telemetry">Nothing here is missing</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The instrument, the calendar dates and the headlines are withheld deliberately, and the prices are rebased so
          the chart cannot be matched to a real one. Structure is untouched — fibonacci levels, trendlines and
          risk-to-reward all behave exactly as they would on the real series. You choose when to unblind, after the
          session closes.
        </p>
      </div>
    </aside>
  )
}
