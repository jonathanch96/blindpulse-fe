"use client"

import type { ScaleMode } from "@/features/chart/types"
import { cn } from "@/lib/utils"

const modes: { value: ScaleMode; label: string; title: string }[] = [
  { value: "log", label: "LOG", title: "Logarithmic — equal ratios take equal vertical space" },
  { value: "auto", label: "AUTO", title: "Linear between the window's extremes" },
  { value: "percent", label: "%", title: "Percentage return from the window's first close" },
]

export function ScaleModeToggle({ mode, onChange }: { mode: ScaleMode; onChange: (mode: ScaleMode) => void }) {
  return (
    <div className="flex items-center gap-px border border-seam" role="group" aria-label="Price scale">
      {modes.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          onClick={() => onChange(option.value)}
          aria-pressed={mode === option.value}
          className={cn(
            "label-caps px-1.5 py-1",
            mode === option.value ? "bg-telemetry text-telemetry-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
