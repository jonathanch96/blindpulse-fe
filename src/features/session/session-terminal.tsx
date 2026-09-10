"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lock, Square } from "lucide-react"
import { useCallback, useEffect, useReducer, useState } from "react"
import { toast } from "sonner"

import {
  closeSession,
  fetchSession,
  fetchSessionView,
  pauseSession,
  resumeSession,
  setSessionSpeed,
  setSessionTimeframe,
  stepSession,
} from "@/features/session/api"
import { TransportBar } from "@/features/session/components/transport-bar"
import { PriceChart } from "@/features/chart/price-chart"
import { DrawingToolbar } from "@/features/drawing/drawing-toolbar"
import { drawingReducer, initialDrawingState, visibleOn } from "@/features/drawing/reducer"
import { ScaleModeToggle } from "@/features/chart/scale-mode-toggle"
import type { ScaleMode } from "@/features/chart/types"
import type { StreamStatus } from "@/features/session/stream"
import { useReplayStream } from "@/features/session/use-replay-stream"
import type { ReplaySession, SessionBar } from "@/features/session/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { apiErrorMessage } from "@/lib/envelope"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

const timeframes = ["15m", "30m", "1h", "4h", "1d"] as const

export function SessionTerminal({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const [scaleMode, setScaleMode] = useState<ScaleMode>("auto")
  const [readout, setReadout] = useState<SessionBar | null>(null)
  // Drawings live in component state for now. Persistence is Sprint 05 (FR-TA-11), and building
  // the storage round trip before the tools are settled would be designing a schema for a shape
  // that is still moving.
  const [drawing, dispatch] = useReducer(drawingReducer, initialDrawingState)

  const { data: session, isPending } = useQuery({
    queryKey: qk.session(sessionId),
    queryFn: () => fetchSession(sessionId),
  })

  // Bars are keyed by the timeframe but not by the revealed edge. Under 03C the edge was part of
  // the key, so a step invalidated the window and refetched it; now the stream folds each released
  // bar into this entry in place, and refetching per bar at 10x would be forty round trips a
  // second. Freshness comes from the socket, and from the gap check that refetches when frames
  // were dropped.
  const { data: view } = useQuery({
    queryKey: qk.sessionView(sessionId, session?.timeframe ?? ""),
    queryFn: () => fetchSessionView(sessionId, session?.timeframe),
    enabled: Boolean(session),
  })

  const closed = session?.status === "closed" || session?.status === "abandoned"
  // Nothing to stream from a session that has ended, and a socket that reconnected forever against
  // a closed session would be a retry loop with no possible outcome.
  const stream = useReplayStream(sessionId, { enabled: Boolean(session) && !closed })

  const refresh = useCallback(
    (next: ReplaySession | null) => {
      if (next) queryClient.setQueryData(qk.session(sessionId), next)
    },
    [queryClient, sessionId],
  )

  const onError = (error: unknown) => toast.error(apiErrorMessage(error, "The replay engine refused that"))

  const step = useMutation({ mutationFn: (count: number) => stepSession(sessionId, count), onSuccess: refresh, onError })
  const speed = useMutation({ mutationFn: (value: string) => setSessionSpeed(sessionId, value), onSuccess: refresh, onError })
  const timeframe = useMutation({ mutationFn: (value: string) => setSessionTimeframe(sessionId, value), onSuccess: refresh, onError })
  const togglePlay = useMutation({
    mutationFn: () => (session?.status === "paused" ? resumeSession(sessionId) : pauseSession(sessionId)),
    onSuccess: refresh,
    onError,
  })
  const close = useMutation({
    mutationFn: () => closeSession(sessionId),
    onSuccess: (next) => {
      refresh(next)
      toast.success("Session closed. The reveal unlocks in Sprint 05.")
    },
    onError,
  })

  const busy = step.isPending || speed.isPending || timeframe.isPending || togglePlay.isPending

  // Keyboard, bound on the window rather than a focused element so it works wherever the trader's
  // attention is, and skipped while typing so it cannot eat a keystroke.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return
      if (event.code === "Space") {
        event.preventDefault()
        if (!busy) step.mutate(1)
        return
      }
      if (event.key === "Escape") {
        // Escape abandons a half-drawn shape and drops the selection, in that order — the trader
        // pressing it wants out of whatever mode they are in.
        dispatch({ type: "cancelDraft" })
        dispatch({ type: "select", id: null })
        dispatch({ type: "selectTool", tool: "cursor" })
        return
      }
      if ((event.key === "Delete" || event.key === "Backspace") && drawing.selectedId) {
        event.preventDefault()
        dispatch({ type: "remove", id: drawing.selectedId })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, step, drawing.selectedId])

  if (isPending || !session) {
    return (
      <div className="space-y-px p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const rewound = session.cursorIndex < session.revealedIndex

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-seam bg-panel px-3 py-2">
        <span className="flex items-center gap-2 border border-seam bg-panel-raised px-2 py-1">
          <Lock className="size-3.5 text-primary" aria-hidden="true" />
          <span className="metric text-[13px] font-semibold">Asset masked</span>
        </span>

        <div className="flex items-center gap-px border border-seam" role="group" aria-label="Timeframe">
          {timeframes.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => timeframe.mutate(value)}
              disabled={busy || closed}
              aria-pressed={session.timeframe === value}
              className={cn(
                "metric px-2.5 py-1 text-xs disabled:opacity-50",
                session.timeframe === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        {/* Rewinding is review, not time travel: the trader can look back, but the engine still
            knows how far they have actually been shown. Saying so keeps the state legible. */}
        {rewound ? (
          <span className="label-caps border border-telemetry/40 bg-telemetry-muted px-2 py-1 text-telemetry">
            Reviewing T-{session.revealedIndex - session.cursorIndex} · live edge held
          </span>
        ) : null}

        <span className="metric ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {closed ? null : <StreamIndicator status={stream.status} latencyMs={stream.latencyMs} />}
          {closed ? "Session closed" : `${session.status} · ${session.speed}x`}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 rounded-sm"
          onClick={() => close.mutate()}
          disabled={closed || close.isPending}
        >
          <Square className="size-3" aria-hidden="true" />
          <span className="label-caps">End session</span>
        </Button>
      </div>

      <section className="flex min-h-0 flex-1 flex-col bg-panel" aria-label="Price">
        <div className="flex items-center justify-between gap-3 border-b border-seam px-3 py-1.5">
          <p className="label-caps text-muted-foreground">
            Price · {view?.timeframe ?? session.timeframe} · {view?.bars.length ?? 0} bars · EMA 20/50/200 · RSI 14
          </p>
          <div className="flex items-center gap-3">
            {readout ? (
              <span className="metric text-[11px] text-muted-foreground">
                O {readout.open} H {readout.high} L {readout.low} C {readout.close}
                {readout.forming ? " · forming" : ""}
              </span>
            ) : null}
            <ScaleModeToggle mode={scaleMode} onChange={setScaleMode} />
          </div>
        </div>
        <div className="flex min-h-0 flex-1">
          <DrawingToolbar
            tool={drawing.tool}
            magnet={drawing.magnet}
            hasSelection={drawing.selectedId !== null}
            drawingCount={visibleOn(drawing.drawings, session.timeframe).length}
            onTool={(tool) => dispatch({ type: "selectTool", tool })}
            onToggleMagnet={() => dispatch({ type: "toggleMagnet" })}
            onDeleteSelected={() => drawing.selectedId && dispatch({ type: "remove", id: drawing.selectedId })}
            onClearAll={() => dispatch({ type: "clearAll" })}
          />
          <div className="min-h-0 flex-1">
            <PriceChart
              bars={view?.bars ?? []}
              scaleMode={scaleMode}
              onReadout={setReadout}
              surface={{
                drawings: visibleOn(drawing.drawings, session.timeframe),
                draft: drawing.draft,
                draftKind: drawing.draftKind,
                tool: drawing.tool,
                magnet: drawing.magnet,
                timeframe: session.timeframe,
                selectedId: drawing.selectedId,
                onPlace: (anchor) => dispatch({ type: "place", anchor, id: crypto.randomUUID(), timeframe: session.timeframe }),
                onEndStroke: () => dispatch({ type: "endStroke", id: crypto.randomUUID(), timeframe: session.timeframe }),
                onSelect: (id) => dispatch({ type: "select", id }),
                onReplaceAnchors: (id, anchors) => dispatch({ type: "replaceAnchors", id, anchors }),
              }}
            />
          </div>
        </div>
      </section>

      <TransportBar
        session={session}
        busy={busy}
        onStep={(count) => step.mutate(count)}
        onSpeed={(value) => speed.mutate(value)}
        onTogglePlay={() => togglePlay.mutate()}
      />
    </div>
  )
}

// StreamIndicator is the FR-REPLAY-08 readout: the feed latency the server measured, next to a
// state the trader can act on. It reports the connection honestly — a terminal that looks live
// while its socket is down is worse than one that admits it is reconnecting, because the trader
// would be reading a frozen chart as a quiet market.
function StreamIndicator({ status, latencyMs }: { status: StreamStatus; latencyMs: number | null }) {
  const live = status === "live"
  const label =
    status === "live" ? (latencyMs === null ? "live" : `${latencyMs}ms`)
    : status === "connecting" ? "connecting"
    : status === "reconnecting" ? "reconnecting"
    : status === "offline" ? "offline"
    : "idle"
  return (
    <span
      className={cn(
        "label-caps flex items-center gap-1.5 border px-1.5 py-0.5",
        live ? "border-primary/40 text-primary" : "border-bearish/40 text-bearish",
      )}
      // The dot is decorative; the text beside it carries the same information, so a screen
      // reader gets the state without a colour it cannot see.
      role="status"
    >
      <span className={cn("size-1.5 rounded-full", live ? "bg-primary" : "bg-bearish")} aria-hidden="true" />
      {label}
    </span>
  )
}
