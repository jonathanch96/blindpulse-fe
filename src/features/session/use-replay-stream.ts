"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"

import { fetchStreamTicket } from "@/features/session/api"
import { applyFrame, decodeFrame, hasGap, mergeBar, nextBackoffMs, type StreamStatus } from "@/features/session/stream"
import type { ReplaySession, SessionBars } from "@/features/session/types"
import { qk } from "@/lib/query-keys"

export type ReplayStream = {
  status: StreamStatus
  /** Server-measured latency from bar release to frame write, for the FR-REPLAY-08 readout. */
  latencyMs: number | null
}

type Options = {
  /** Connecting to a closed session is pointless, so the terminal switches this off. */
  enabled: boolean
}

// useReplayStream holds one websocket for the session and folds frames into the query cache.
//
// The direction of authority is the whole design: the server drives, and this hook renders what it
// is told. It sends exactly one message — a hello announcing where it thinks it is — and the answer
// to that is a sync frame stating where the server is. The client's claim changes nothing (BR-02).
function lastBarIndex(bars: { index: number }[]): number {
  return bars.length === 0 ? -1 : bars[bars.length - 1].index
}

export function useReplayStream(sessionId: string, { enabled }: Options): ReplayStream {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StreamStatus>("idle")
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  // Kept in refs rather than state: the socket callbacks must not re-run the connect effect, and
  // a reconnect that tore down and rebuilt the socket on every frame would never stay up.
  const socketRef = useRef<WebSocket | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attemptRef = useRef(0)
  const closedRef = useRef(false)

  const applyToCache = useCallback(
    (frame: ReturnType<typeof decodeFrame>) => {
      if (!frame) return
      if (frame.kind !== "heartbeat") {
        setLatencyMs(frame.latencyMs)
        queryClient.setQueryData<ReplaySession | null>(qk.session(sessionId), (current) =>
          current ? applyFrame(current, frame) : current,
        )
      }
      if (!frame.bar) {
        // A sync frame with no bar means the session has released nothing yet; anything else with
        // no bar is a state change, and the series is unaffected.
        return
      }
      const bar = frame.bar
      const key = qk.sessionView(sessionId, frame.timeframe)
      const cached = queryClient.getQueryData<SessionBars | null>(key)
      if (!cached) return
      if (frame.kind === "sync" || hasGap(cached.bars, bar)) {
        // Either we have just (re)connected, or backpressure collapsed frames and bars were
        // skipped. Refetch the window rather than draw a chart with a hole in it.
        void queryClient.invalidateQueries({ queryKey: key })
        if (frame.kind !== "sync") {
          // A gap means we no longer know where we are. Announce the last index we did see; the
          // server answers with its own cursor, which is the only one that counts (BR-02).
          socketRef.current?.send(JSON.stringify({ type: "hello", last_index: lastBarIndex(cached.bars) }))
        }
        return
      }
      const bars = mergeBar(cached.bars, bar)
      queryClient.setQueryData<SessionBars>(key, { ...cached, to: lastBarIndex(bars), bars })
    },
    [queryClient, sessionId],
  )

  useEffect(() => {
    if (!enabled) return
    closedRef.current = false

    function scheduleRetry() {
      if (closedRef.current) return
      const delay = nextBackoffMs(attemptRef.current)
      attemptRef.current += 1
      setStatus("reconnecting")
      retryRef.current = setTimeout(() => void connect(), delay)
    }

    async function connect() {
      if (closedRef.current) return
      setStatus((current) => (current === "reconnecting" ? current : "connecting"))
      let ticket: Awaited<ReturnType<typeof fetchStreamTicket>>
      try {
        // A fresh ticket per attempt, always: tickets are single-use, so a reconnect cannot reuse
        // the one that opened the socket that just died.
        ticket = await fetchStreamTicket(sessionId)
      } catch {
        scheduleRetry()
        return
      }
      if (!ticket || closedRef.current) {
        if (!closedRef.current) scheduleRetry()
        return
      }

      const socket = new WebSocket(`${ticket.url}?ticket=${encodeURIComponent(ticket.ticket)}`)
      socketRef.current = socket

      socket.onopen = () => {
        attemptRef.current = 0
        setStatus("live")
        // No hello here: the server leads every connection with a sync frame, so asking where we
        // are the moment it has just told us would only cost a second frame and a second refetch.
        // The hello is for a client that has lost its place mid-connection — see requestResync.
      }
      socket.onmessage = (event) => {
        if (typeof event.data === "string") applyToCache(decodeFrame(event.data))
      }
      socket.onerror = () => socket.close()
      socket.onclose = () => {
        socketRef.current = null
        if (closedRef.current) return
        setStatus("offline")
        scheduleRetry()
      }
    }

    void connect()

    return () => {
      closedRef.current = true
      if (retryRef.current) clearTimeout(retryRef.current)
      retryRef.current = null
      // 1000 is a normal closure: this socket is going away because the component unmounted or the
      // session ended, not because anything went wrong.
      socketRef.current?.close(1000)
      socketRef.current = null
    }
  }, [applyToCache, enabled, sessionId])

  // Derived rather than stored: a disabled stream is idle by definition, and writing that into
  // state from the effect would be a render caused by nothing changing.
  if (!enabled) return { status: "idle", latencyMs: null }
  return { status, latencyMs }
}
