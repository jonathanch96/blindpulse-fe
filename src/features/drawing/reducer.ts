import Decimal from "decimal.js"

import { toolSpecs, type Anchor, type Drawing, type DrawingKind, type DrawingTool } from "@/features/drawing/types"

// The drawing tools as a pure state machine.
//
// Everything the trader can do to a drawing is an action here, and nothing in this file touches a
// canvas, a pointer or the clock. That is what makes "a new bar must not move a drawing" and "a
// half-drawn fib must not commit" testable claims rather than things you check by hand.

export type DrawingState = {
  tool: DrawingTool
  /** Snap anchors to the nearest OHLC price. On by default: an unsnapped anchor is imprecise. */
  magnet: boolean
  drawings: Drawing[]
  /** Anchors placed for the drawing currently being made, if any. */
  draft: Anchor[]
  draftKind: DrawingKind | null
  selectedId: string | null
}

export const initialDrawingState: DrawingState = {
  tool: "cursor",
  magnet: true,
  drawings: [],
  draft: [],
  draftKind: null,
  selectedId: null,
}

export type DrawingAction =
  | { type: "selectTool"; tool: DrawingTool }
  | { type: "toggleMagnet" }
  // The id is supplied by the caller rather than generated here, so the reducer stays a pure
  // function of its inputs and a test can assert on an exact result.
  | { type: "place"; anchor: Anchor; id: string; timeframe: string }
  | { type: "endStroke"; id: string; timeframe: string }
  | { type: "cancelDraft" }
  | { type: "select"; id: string | null }
  | { type: "replaceAnchors"; id: string; anchors: Anchor[] }
  | { type: "setOpacity"; id: string; opacity: number }
  | { type: "setText"; id: string; text: string }
  | { type: "remove"; id: string }
  | { type: "clearAll" }
  // Replaces the whole list with what the server holds, on load. It is deliberately a replace
  // rather than a merge: a session's stored drawings are the truth about that session, and merging
  // would mean a half-drawn line from before a reload surviving as a line the trader never made.
  | { type: "hydrate"; drawings: Drawing[] }

/** The drawings that belong on a given timeframe. Anchors from another one would point at the
 * wrong bars, so they are hidden rather than relocated. */
export function visibleOn(drawings: Drawing[], timeframe: string): Drawing[] {
  return drawings.filter((drawing) => drawing.timeframe === timeframe)
}

export function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case "selectTool":
      // Switching tools abandons anything half-drawn. Carrying a stray anchor into the next tool
      // would commit a drawing the trader never finished asking for.
      return { ...state, tool: action.tool, draft: [], draftKind: null, selectedId: null }

    case "toggleMagnet":
      return { ...state, magnet: !state.magnet }

    case "hydrate":
      // Tool and magnet are the trader's current settings and survive; the draft does not, because
      // a half-drawn shape belongs to an interaction that is over.
      return { ...state, drawings: action.drawings, draft: [], draftKind: null, selectedId: null }

    case "place": {
      if (state.tool === "cursor") return state
      const kind = state.tool
      const spec = toolSpecs[kind]
      const draft = state.draftKind === kind ? [...state.draft, action.anchor] : [action.anchor]
      if (spec.freehand) {
        return { ...state, draft, draftKind: kind }
      }
      if (draft.length < spec.anchors) {
        return { ...state, draft, draftKind: kind }
      }
      return {
        ...state,
        drawings: [...state.drawings, newDrawing(action.id, kind, action.timeframe, draft)],
        draft: [],
        draftKind: null,
        selectedId: action.id,
      }
    }

    case "endStroke": {
      const kind = state.draftKind
      // A stroke of one point is a stray click, not a drawing. Committing it would litter the
      // chart with invisible one-pixel objects that still answer hit tests.
      if (!kind || state.draft.length < 2) {
        return { ...state, draft: [], draftKind: null }
      }
      return {
        ...state,
        drawings: [...state.drawings, newDrawing(action.id, kind, action.timeframe, state.draft)],
        draft: [],
        draftKind: null,
        selectedId: action.id,
      }
    }

    case "cancelDraft":
      return { ...state, draft: [], draftKind: null }

    case "select":
      return { ...state, selectedId: action.id }

    case "replaceAnchors":
      // The caller computes the whole new anchor set from the drag's starting point, so a long
      // drag cannot accumulate rounding the way repeated deltas would.
      return {
        ...state,
        drawings: state.drawings.map((drawing) =>
          drawing.id === action.id ? { ...drawing, anchors: action.anchors } : drawing,
        ),
      }

    case "setOpacity":
      return {
        ...state,
        drawings: state.drawings.map((drawing) =>
          drawing.id === action.id ? { ...drawing, opacity: clampOpacity(action.opacity) } : drawing,
        ),
      }

    case "setText":
      return {
        ...state,
        drawings: state.drawings.map((drawing) =>
          drawing.id === action.id ? { ...drawing, text: action.text } : drawing,
        ),
      }

    case "remove":
      return {
        ...state,
        drawings: state.drawings.filter((drawing) => drawing.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
      }

    case "clearAll":
      return { ...state, drawings: [], draft: [], draftKind: null, selectedId: null }

    default:
      return state
  }
}

function newDrawing(id: string, kind: DrawingKind, timeframe: string, anchors: Anchor[]): Drawing {
  const drawing: Drawing = { id, kind, timeframe, anchors }
  if (kind === "zone") drawing.opacity = 0.18
  if (kind === "note") drawing.text = ""
  return drawing
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) return 0.18
  return Math.min(1, Math.max(0.02, value))
}

/**
 * Moves every anchor of a drawing by a whole number of bars and a price delta.
 *
 * The price delta is a decimal string and the addition is decimal: dragging a level across the
 * chart and back must land on the price it started from, and float addition does not promise that.
 */
export function translateAnchors(anchors: Anchor[], deltaIndex: number, deltaPrice: string): Anchor[] {
  const delta = new Decimal(deltaPrice)
  return anchors.map((anchor) => ({
    index: anchor.index + deltaIndex,
    price: new Decimal(anchor.price).plus(delta).toString(),
  }))
}
