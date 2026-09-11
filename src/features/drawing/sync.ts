import type { Drawing } from "@/features/drawing/types"

/**
 * What has to be sent to the server to make it match the canvas.
 *
 * This is a diff rather than a write-through for a specific reason: the reducer decides when a
 * drawing exists. A trendline is not created by a click, it is created by the *second* click, and
 * a brush stroke by releasing the mouse — so a caller watching dispatches cannot tell a create from
 * a no-op. Watching the resulting list can.
 *
 * Kept pure and separate from the effect that runs it so the interesting part is testable without a
 * canvas, a network or a React tree.
 */
export type SyncPlan = {
  created: Drawing[]
  updated: Drawing[]
  deletedIds: string[]
}

export function syncPlan(previous: Drawing[], next: Drawing[]): SyncPlan {
  const before = new Map(previous.map((drawing) => [drawing.id, drawing]))
  const after = new Map(next.map((drawing) => [drawing.id, drawing]))

  const created: Drawing[] = []
  const updated: Drawing[] = []
  for (const drawing of next) {
    const existing = before.get(drawing.id)
    if (!existing) {
      created.push(drawing)
    } else if (changed(existing, drawing)) {
      updated.push(drawing)
    }
  }

  const deletedIds = previous.filter((drawing) => !after.has(drawing.id)).map((drawing) => drawing.id)
  return { created, updated, deletedIds }
}

export function isEmptyPlan(plan: SyncPlan): boolean {
  return plan.created.length === 0 && plan.updated.length === 0 && plan.deletedIds.length === 0
}

// Compared by value rather than by reference. The reducer replaces the array on every action, so a
// reference check would call the whole list changed on a selection — and a selection is not a
// change worth a round trip, let alone one per drawing.
function changed(before: Drawing, after: Drawing): boolean {
  if (before.text !== after.text || before.opacity !== after.opacity) return true
  if (before.anchors.length !== after.anchors.length) return true
  return before.anchors.some((anchor, index) => {
    const other = after.anchors[index]
    return anchor.index !== other.index || anchor.price !== other.price
  })
}
