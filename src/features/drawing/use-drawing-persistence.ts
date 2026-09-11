"use client"

import { useEffect, useRef } from "react"

import { createDrawing, deleteDrawing, fetchDrawings, updateDrawing } from "@/features/drawing/api"
import { isEmptyPlan, syncPlan } from "@/features/drawing/sync"
import type { Drawing } from "@/features/drawing/types"

/**
 * Persists the canvas (FR-TA-11).
 *
 * Two things make this less trivial than it looks.
 *
 * **Ids.** The reducer mints a local id the moment a drawing exists, because the renderer needs one
 * immediately; the server mints its own on insert. The map from one to the other is kept here, so
 * the canvas never has to wait for a round trip to draw a line and a later reshape still addresses
 * the right row.
 *
 * **Failure.** A refused write leaves the canvas as the trader drew it and logs. The alternative —
 * removing a line because the server said no — would make the chart flicker at exactly the moment
 * the trader is concentrating, and a drawing is not worth that. It is reported through `onError`
 * so the caller can decide whether the trader needs to know.
 *
 * The callbacks are held in refs rather than listed as effect dependencies. That is not a style
 * choice: an inline `onError={(e) => toast.error(e)}` is a new function on every render, which made
 * the hydrate effect re-run, which ran its cleanup, which set `cancelled` on the *in-flight* fetch —
 * so the drawings loaded and were then thrown away, and the canvas came back empty after a reload.
 * A hook that only works when its caller memoizes is a hook with a trap in it.
 */
export function useDrawingPersistence({
  sessionId,
  drawings,
  enabled,
  onHydrate,
  onError,
}: {
  sessionId: string
  drawings: Drawing[]
  enabled: boolean
  onHydrate: (drawings: Drawing[]) => void
  onError?: (error: unknown) => void
}) {
  // What the server is believed to hold, in canvas terms. Seeded by the hydrate below so the first
  // diff after a reload is empty rather than re-creating everything the trader already saved.
  const synced = useRef<Drawing[]>([])
  const serverIds = useRef(new Map<string, string>())
  const hydrated = useRef(false)
  const inFlight = useRef(false)

  const handlers = useRef({ onHydrate, onError })
  // Assigned in an effect rather than during render: the compiler's rule is right, and a ref written
  // while rendering is a value that can differ between a render and the commit that follows it. This
  // runs before the effects below, so they always see the current callbacks.
  useEffect(() => {
    handlers.current = { onHydrate, onError }
  })

  useEffect(() => {
    if (!enabled || hydrated.current) return
    hydrated.current = true
    let cancelled = false
    void fetchDrawings(sessionId)
      .then((stored) => {
        // Only a real session change cancels this now, which is the case the flag was for.
        if (cancelled) return
        synced.current = stored
        for (const drawing of stored) serverIds.current.set(drawing.id, drawing.id)
        handlers.current.onHydrate(stored)
      })
      .catch((error) => handlers.current.onError?.(error))
    return () => {
      cancelled = true
    }
  }, [sessionId, enabled])

  useEffect(() => {
    if (!enabled || !hydrated.current || inFlight.current) return
    const plan = syncPlan(synced.current, drawings)
    if (isEmptyPlan(plan)) return

    inFlight.current = true
    // Snapshot first: the canvas may move again while these are in flight, and the next diff should
    // be against what this round is sending rather than against what it started from.
    synced.current = drawings
    void (async () => {
      try {
        for (const drawing of plan.created) {
          const stored = await createDrawing(sessionId, drawing)
          if (stored) serverIds.current.set(drawing.id, stored.id)
        }
        for (const drawing of plan.updated) {
          const id = serverIds.current.get(drawing.id)
          // No server id means the create is still in flight or was refused. Skipping is right:
          // the next diff will see the difference again once the id lands.
          if (id) await updateDrawing(sessionId, { ...drawing, id })
        }
        for (const localId of plan.deletedIds) {
          const id = serverIds.current.get(localId)
          if (id) await deleteDrawing(sessionId, id)
          serverIds.current.delete(localId)
        }
      } catch (error) {
        handlers.current.onError?.(error)
      } finally {
        inFlight.current = false
      }
    })()
  }, [sessionId, drawings, enabled])
}
