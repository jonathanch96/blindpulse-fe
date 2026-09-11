import type { Drawing, DrawingKind } from "@/features/drawing/types"
import { apiFetch } from "@/lib/api-client"

/**
 * The terminal's tool names and the server's kind vocabulary.
 *
 * Nine of the eleven are the same word. Two are not, because the server's identifiers are
 * lower-snake — the column's shape constraint enforces that — and the toolkit's are camelCase. The
 * translation is here, at the boundary, rather than by renaming either side: renaming the toolkit
 * would ripple through the reducer, the renderer and the hit-testing, and loosening the server's
 * vocabulary to accept camelCase would mean two spellings of one tool in the database.
 */
const kindToWire: Record<DrawingKind, string> = {
  trendline: "trendline",
  horizontal: "horizontal",
  ray: "ray",
  extended: "extended",
  vertical: "vertical",
  fib: "fib_retracement",
  fibExtension: "fib_extension",
  zone: "zone",
  polyline: "polyline",
  brush: "brush",
  note: "note",
}

const wireToKind = Object.fromEntries(
  Object.entries(kindToWire).map(([kind, wire]) => [wire, kind as DrawingKind]),
) as Record<string, DrawingKind>

type StoredDrawing = {
  id: string
  kind: string
  timeframe: string
  createdBarIndex: number
  payload: { anchors: Drawing["anchors"]; text?: string; opacity?: number }
  version: number
}

// A drawing's anchors, text and shading are the payload; its kind, timeframe and anchoring bar are
// columns, because the server bounds the last one against the cursor and filters on the other two.
function toStored(drawing: Drawing): { kind: string; timeframe: string; createdBarIndex: number; payload: object } {
  return {
    kind: kindToWire[drawing.kind],
    timeframe: drawing.timeframe,
    // The anchoring bar is the earliest bar the drawing touches. Anything later would be a bar the
    // trader might not have been shown when they drew it, and the server refuses those.
    createdBarIndex: Math.min(...drawing.anchors.map((anchor) => anchor.index)),
    payload: { anchors: drawing.anchors, text: drawing.text, opacity: drawing.opacity },
  }
}

function fromStored(stored: StoredDrawing): Drawing | null {
  const kind = wireToKind[stored.kind]
  // A kind this build does not know about is skipped rather than guessed at. Rendering an unknown
  // tool as a trendline would put a line on the chart the trader never drew.
  if (!kind) return null
  return {
    id: stored.id,
    kind,
    timeframe: stored.timeframe,
    anchors: stored.payload?.anchors ?? [],
    text: stored.payload?.text,
    opacity: stored.payload?.opacity,
  }
}

export async function fetchDrawings(sessionId: string): Promise<Drawing[]> {
  const envelope = await apiFetch<StoredDrawing[]>(`/api/sessions/${encodeURIComponent(sessionId)}/drawings`)
  return (envelope.data ?? []).map(fromStored).filter((drawing): drawing is Drawing => drawing !== null)
}

export async function createDrawing(sessionId: string, drawing: Drawing): Promise<Drawing | null> {
  const envelope = await apiFetch<StoredDrawing>(`/api/sessions/${encodeURIComponent(sessionId)}/drawings`, {
    method: "POST",
    body: JSON.stringify(toStored(drawing)),
  })
  return envelope.data ? fromStored(envelope.data) : null
}

export async function updateDrawing(sessionId: string, drawing: Drawing): Promise<void> {
  await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/drawings/${encodeURIComponent(drawing.id)}`, {
    method: "PATCH",
    body: JSON.stringify({ payload: { anchors: drawing.anchors, text: drawing.text, opacity: drawing.opacity } }),
  })
}

export async function deleteDrawing(sessionId: string, drawingId: string): Promise<void> {
  await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/drawings/${encodeURIComponent(drawingId)}`, {
    method: "DELETE",
  })
}

export { kindToWire }
