"use client"

import {
  Baseline,
  Box,
  Magnet,
  MousePointer2,
  Move3d,
  MoveUpRight,
  PenLine,
  Spline,
  StickyNote,
  Trash2,
  TrendingUp,
  Waypoints,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { toolSpecs, type DrawingKind, type DrawingTool } from "@/features/drawing/types"
import { cn } from "@/lib/utils"

const icons: Record<DrawingKind, LucideIcon> = {
  trendline: TrendingUp,
  horizontal: Baseline,
  ray: MoveUpRight,
  extended: Move3d,
  vertical: Waypoints,
  fib: Spline,
  fibExtension: Spline,
  zone: Box,
  polyline: Waypoints,
  brush: PenLine,
  note: StickyNote,
}

// The ribbon from the design system: 32px targets, and the active tool marked by a 2px cyan strip
// rather than a fill. A filled active state competes with the chart for attention, and the chart
// is the thing being read.
const order: DrawingKind[] = [
  "trendline",
  "horizontal",
  "ray",
  "extended",
  "vertical",
  "fib",
  "fibExtension",
  "zone",
  "polyline",
  "brush",
  "note",
]

export function DrawingToolbar({
  tool,
  magnet,
  hasSelection,
  drawingCount,
  onTool,
  onToggleMagnet,
  onDeleteSelected,
  onClearAll,
}: {
  tool: DrawingTool
  magnet: boolean
  hasSelection: boolean
  drawingCount: number
  onTool: (tool: DrawingTool) => void
  onToggleMagnet: () => void
  onDeleteSelected: () => void
  onClearAll: () => void
}) {
  return (
    <div
      className="flex w-10 shrink-0 flex-col items-center gap-px border-r border-seam bg-panel py-1"
      role="toolbar"
      aria-orientation="vertical"
      aria-label="Drawing tools"
    >
      <ToolButton
        icon={MousePointer2}
        label="Select"
        hint="Click a drawing to select it; drag to move, drag a handle to reshape"
        active={tool === "cursor"}
        onClick={() => onTool("cursor")}
      />
      <span className="my-1 h-px w-5 bg-seam" aria-hidden="true" />
      {order.map((kind) => (
        <ToolButton
          key={kind}
          icon={icons[kind]}
          label={toolSpecs[kind].label}
          hint={toolSpecs[kind].hint}
          active={tool === kind}
          onClick={() => onTool(kind)}
        />
      ))}
      <span className="my-1 h-px w-5 bg-seam" aria-hidden="true" />
      <ToolButton
        icon={Magnet}
        label={magnet ? "Magnet on" : "Magnet off"}
        hint="Snap anchors to the nearest open, high, low or close"
        active={magnet}
        onClick={onToggleMagnet}
      />
      <ToolButton
        icon={Trash2}
        label={hasSelection ? "Delete selected" : "Clear all drawings"}
        hint={hasSelection ? "Removes the selected drawing" : "Removes every drawing on this session"}
        active={false}
        disabled={drawingCount === 0}
        onClick={hasSelection ? onDeleteSelected : onClearAll}
      />
    </div>
  )
}

function ToolButton({
  icon: Icon,
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  label: string
  hint: string
  active: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={`${label} — ${hint}`}
      className={cn(
        "relative flex size-8 items-center justify-center text-muted-foreground transition-colors",
        "hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        active && "text-telemetry",
      )}
    >
      {/* The 2px strip, per the design system. It is the active marker; the colour change alone
          would not survive a colour-blind reading of the ribbon. */}
      {active ? <span className="absolute left-0 top-1 h-6 w-0.5 bg-telemetry" aria-hidden="true" /> : null}
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
