import { EyeOff, Lock } from "lucide-react"

import { cn } from "@/lib/utils"

// The persistent reminder that the chart is masked. It is deliberately loud: the entire premise
// falls apart the moment a trader forgets they are not supposed to know what they are looking at.
export function BlindModeChip({ blinded, className }: { blinded: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1",
        blinded ? "border-bearish/40 bg-bearish-muted text-bearish" : "border-seam bg-panel-raised text-muted-foreground",
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", blinded ? "bg-bearish" : "bg-muted-foreground")} aria-hidden="true" />
      <span className="label-caps">{blinded ? "Blind mode active" : "Unblinded"}</span>
      {blinded ? <Lock className="size-3" aria-hidden="true" /> : <EyeOff className="size-3" aria-hidden="true" />}
    </span>
  )
}
