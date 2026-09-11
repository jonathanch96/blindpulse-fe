"use client"

import { Pause, Play, SkipForward } from "lucide-react"

import { playbackSpeeds, type ReplaySession } from "@/features/session/types"
import { cn } from "@/lib/utils"

// The transport asks the server to move; it never moves a cursor of its own. Every readout here
// comes from the session the server returned, so what the trader sees is what the server believes.
export function TransportBar({
  session,
  onStep,
  onSpeed,
  onTogglePlay,
  busy,
}: {
  session: ReplaySession
  /** Advances the cursor. Forward only — the server refuses a negative count. */
  onStep: (count: number) => void
  onSpeed: (speed: string) => void
  onTogglePlay: () => void
  busy: boolean
}) {
  const atEnd = session.cursorIndex >= session.totalBars - 1
  const closed = session.status === "closed" || session.status === "abandoned"

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-seam bg-panel px-3 py-2">
      <div className="flex items-center gap-px border border-seam" role="group" aria-label="Transport">
        {/* There is no step-back control, and that is the product rather than an omission: the
            cursor only moves forward. Once a bar is stepped past it is history, the way it is on a
            live chart, and a trader who wants a different setup randomizes a new feed. */}
        <TransportButton
          label={session.status === "paused" ? "Resume" : "Pause"}
          onClick={onTogglePlay}
          disabled={busy || closed}
        >
          {session.status === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
        </TransportButton>
        {/* Disabled at the end of the feed rather than silently doing nothing: a control that
            looks live and is inert reads as a bug in the app, not as the end of the data. */}
        <TransportButton label="Step forward" onClick={() => onStep(1)} disabled={busy || closed || atEnd}>
          <SkipForward className="size-4" />
        </TransportButton>
      </div>

      <div className="flex items-center gap-px border border-seam" role="group" aria-label="Playback speed">
        {playbackSpeeds.map((speed) => (
          <button
            key={speed}
            type="button"
            onClick={() => onSpeed(speed)}
            disabled={busy || closed}
            aria-pressed={session.speed === speed}
            className={cn(
              "metric px-2 py-1.5 text-xs disabled:opacity-50",
              session.speed === speed ? "bg-telemetry text-telemetry-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {speed}x
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1 w-40 overflow-hidden bg-seam" role="progressbar"
          aria-valuenow={session.barsScanned} aria-valuemin={0} aria-valuemax={session.totalBars}>
          <div
            className="h-full bg-primary"
            style={{ width: `${Math.min(100, (session.barsScanned / Math.max(1, session.totalBars)) * 100)}%` }}
          />
        </div>
        {/* The PRD's "142 / 500 bars scanned" readout. The server sends this counted from one, so
            the off-by-one against the cursor index lives in one place rather than here. */}
        <span className="metric text-xs text-muted-foreground">
          {session.barsScanned}/{session.totalBars}
        </span>
      </div>
    </div>
  )
}

function TransportButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}
