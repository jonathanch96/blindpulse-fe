"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lock, Square } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
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
import { ScaleModeToggle } from "@/features/chart/scale-mode-toggle"
import type { ScaleMode } from "@/features/chart/types"
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

  const { data: session, isPending } = useQuery({
    queryKey: qk.session(sessionId),
    queryFn: () => fetchSession(sessionId),
  })

  // Bars are keyed by the revealed edge and the timeframe, so a stale window can never be served
  // from cache after a step — showing the trader the wrong bar is the one thing this must not do.
  const { data: view } = useQuery({
    queryKey: [...qk.session(sessionId), "view", session?.timeframe ?? "", session?.revealedIndex ?? -1],
    queryFn: () => fetchSessionView(sessionId),
    enabled: Boolean(session),
  })

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

  // Spacebar steps, per the PRD. Bound on the window rather than a focused element so it works
  // wherever the trader's attention is, and skipped while typing so it cannot eat a keystroke.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space") return
      const target = event.target as HTMLElement | null
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return
      event.preventDefault()
      if (!busy) step.mutate(1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, step])

  if (isPending || !session) {
    return (
      <div className="space-y-px p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const closed = session.status === "closed" || session.status === "abandoned"
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

        <span className="metric ml-auto text-xs text-muted-foreground">
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
        <div className="min-h-0 flex-1">
          <PriceChart
            bars={view?.bars ?? []}
            scaleMode={scaleMode}
            onReadout={setReadout}
          />
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

