import { describe, expect, it } from "vitest"

import {
  drawingReducer,
  initialDrawingState,
  translateAnchors,
  visibleOn,
  type DrawingAction,
  type DrawingState,
} from "@/features/drawing/reducer"
import type { Anchor } from "@/features/drawing/types"

function run(state: DrawingState, ...actions: DrawingAction[]): DrawingState {
  return actions.reduce(drawingReducer, state)
}

const at = (index: number, price: string): Anchor => ({ index, price })

describe("placing a drawing", () => {
  it("commits only once the tool has all the anchors it needs", () => {
    const afterFirst = run(
      initialDrawingState,
      { type: "selectTool", tool: "trendline" },
      { type: "place", anchor: at(10, "100"), id: "d1", timeframe: "15m" },
    )
    expect(afterFirst.drawings).toHaveLength(0)
    expect(afterFirst.draft).toHaveLength(1)

    const afterSecond = run(afterFirst, { type: "place", anchor: at(20, "110"), id: "d1", timeframe: "15m" })
    expect(afterSecond.drawings).toEqual([
      { id: "d1", kind: "trendline", timeframe: "15m", anchors: [at(10, "100"), at(20, "110")] },
    ])
    expect(afterSecond.draft).toHaveLength(0)
    // Selected on commit: the trader almost always wants to adjust what they just drew.
    expect(afterSecond.selectedId).toBe("d1")
  })

  it("commits a one-anchor tool on the first click", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "horizontal" },
      { type: "place", anchor: at(7, "168.5"), id: "h1", timeframe: "15m" },
    )
    expect(state.drawings).toHaveLength(1)
  })

  it("needs three anchors for a trend-based extension", () => {
    let state = run(initialDrawingState, { type: "selectTool", tool: "fibExtension" })
    state = run(state, { type: "place", anchor: at(1, "100"), id: "x", timeframe: "15m" })
    state = run(state, { type: "place", anchor: at(5, "120"), id: "x", timeframe: "15m" })
    expect(state.drawings).toHaveLength(0)
    state = run(state, { type: "place", anchor: at(8, "110"), id: "x", timeframe: "15m" })
    expect(state.drawings).toHaveLength(1)
    expect(state.drawings[0]!.anchors).toHaveLength(3)
  })

  it("places nothing while the cursor tool is active", () => {
    const state = run(initialDrawingState, { type: "place", anchor: at(3, "100"), id: "nope", timeframe: "15m" })
    expect(state).toBe(initialDrawingState)
  })

  // Carrying a stray anchor into the next tool would commit a drawing the trader never finished
  // asking for — a one-click horizontal appearing because they abandoned a trendline.
  it("abandons a half-drawn shape when the tool changes", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "trendline" },
      { type: "place", anchor: at(10, "100"), id: "d1", timeframe: "15m" },
      { type: "selectTool", tool: "horizontal" },
    )
    expect(state.draft).toHaveLength(0)
    expect(state.draftKind).toBeNull()
    expect(state.drawings).toHaveLength(0)
  })

  it("abandons a half-drawn shape on cancel", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "zone" },
      { type: "place", anchor: at(10, "100"), id: "z", timeframe: "15m" },
      { type: "cancelDraft" },
    )
    expect(state.draft).toHaveLength(0)
    expect(state.drawings).toHaveLength(0)
  })

  it("gives a new zone a shading the trader can see through", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "zone" },
      { type: "place", anchor: at(1, "100"), id: "z", timeframe: "15m" },
      { type: "place", anchor: at(9, "110"), id: "z", timeframe: "15m" },
    )
    expect(state.drawings[0]!.opacity).toBeGreaterThan(0)
    expect(state.drawings[0]!.opacity).toBeLessThan(0.5)
  })
})

describe("freehand strokes", () => {
  it("keeps collecting points until the stroke ends", () => {
    let state = run(initialDrawingState, { type: "selectTool", tool: "polyline" })
    for (let i = 0; i < 5; i += 1) state = run(state, { type: "place", anchor: at(i, "100"), id: "p", timeframe: "15m" })
    expect(state.drawings).toHaveLength(0)
    expect(state.draft).toHaveLength(5)

    state = run(state, { type: "endStroke", id: "p", timeframe: "15m" })
    expect(state.drawings).toHaveLength(1)
    expect(state.drawings[0]!.anchors).toHaveLength(5)
  })

  // A stroke of one point is a stray click. Committing it litters the chart with invisible objects
  // that still answer hit tests, which reads as the chart selecting nothing at random.
  it("discards a stroke of a single point", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "brush" },
      { type: "place", anchor: at(3, "100"), id: "b", timeframe: "15m" },
      { type: "endStroke", id: "b", timeframe: "15m" },
    )
    expect(state.drawings).toHaveLength(0)
  })

  it("ends a stroke that was never started without inventing a drawing", () => {
    const state = run(initialDrawingState, { type: "endStroke", id: "b", timeframe: "15m" })
    expect(state.drawings).toHaveLength(0)
  })
})

describe("selection and editing", () => {
  const withLine = run(
    initialDrawingState,
    { type: "selectTool", tool: "trendline" },
    { type: "place", anchor: at(10, "100"), id: "d1", timeframe: "15m" },
    { type: "place", anchor: at(20, "110"), id: "d1", timeframe: "15m" },
    { type: "selectTool", tool: "cursor" },
  )

  it("replaces the whole anchor set rather than nudging it", () => {
    const moved = run(withLine, { type: "replaceAnchors", id: "d1", anchors: [at(30, "120"), at(40, "130")] })
    expect(moved.drawings[0]!.anchors).toEqual([at(30, "120"), at(40, "130")])
  })

  it("removes the selected drawing and clears the selection with it", () => {
    const selected = run(withLine, { type: "select", id: "d1" })
    const removed = run(selected, { type: "remove", id: "d1" })
    expect(removed.drawings).toHaveLength(0)
    expect(removed.selectedId).toBeNull()
  })

  it("leaves the selection alone when a different drawing is removed", () => {
    const state = run(withLine, { type: "select", id: "d1" }, { type: "remove", id: "other" })
    expect(state.selectedId).toBe("d1")
  })

  it("clamps zone shading to something visible on both ends", () => {
    const state = run(
      initialDrawingState,
      { type: "selectTool", tool: "zone" },
      { type: "place", anchor: at(1, "100"), id: "z", timeframe: "15m" },
      { type: "place", anchor: at(9, "110"), id: "z", timeframe: "15m" },
    )
    expect(run(state, { type: "setOpacity", id: "z", opacity: 5 }).drawings[0]!.opacity).toBe(1)
    // Never fully transparent: a zone at zero opacity is a zone the trader cannot find again.
    expect(run(state, { type: "setOpacity", id: "z", opacity: -1 }).drawings[0]!.opacity).toBeGreaterThan(0)
    expect(run(state, { type: "setOpacity", id: "z", opacity: Number.NaN }).drawings[0]!.opacity).toBeGreaterThan(0)
  })

  it("clears everything at once", () => {
    const state = run(withLine, { type: "select", id: "d1" }, { type: "clearAll" })
    expect(state.drawings).toHaveLength(0)
    expect(state.selectedId).toBeNull()
  })

  it("keeps magnet on by default and toggles it", () => {
    expect(initialDrawingState.magnet).toBe(true)
    expect(run(initialDrawingState, { type: "toggleMagnet" }).magnet).toBe(false)
  })
})

describe("translateAnchors", () => {
  it("moves every anchor by the same bars and price", () => {
    expect(translateAnchors([at(10, "100"), at(20, "110")], 5, "2.5")).toEqual([at(15, "102.5"), at(25, "112.5")])
  })

  // The reason the delta is a decimal string. Dragging a level across the chart and back must land
  // on the price it started from, and float addition does not promise that.
  it("returns to the exact starting price after a round trip", () => {
    const start = [at(10, "168.45319")]
    const there = translateAnchors(start, 3, "0.1")
    const back = translateAnchors(there, -3, "-0.1")
    expect(back).toEqual(start)
  })

  it("survives the deltas that break floats", () => {
    expect(translateAnchors([at(0, "0.1")], 0, "0.2")[0]!.price).toBe("0.3")
  })
})

// Higher timeframes are their own index space: bar 214 on 15m and bar 214 on 1h are different
// moments. A drawing shown on the wrong one would sit at a bar the trader never pointed at, so it
// is hidden instead. Hiding is honest; a line silently relocated is not.
describe("timeframe scoping", () => {
  const drawn = (timeframe: string, id: string) =>
    run(
      initialDrawingState,
      { type: "selectTool", tool: "horizontal" },
      { type: "place", anchor: at(5, "150"), id, timeframe },
    ).drawings[0]!

  it("stamps a drawing with the timeframe it was made on", () => {
    expect(drawn("1h", "a").timeframe).toBe("1h")
  })

  it("shows only the drawings belonging to the current timeframe", () => {
    const drawings = [drawn("15m", "a"), drawn("1h", "b"), drawn("15m", "c")]
    expect(visibleOn(drawings, "15m").map((drawing) => drawing.id)).toEqual(["a", "c"])
    expect(visibleOn(drawings, "1h").map((drawing) => drawing.id)).toEqual(["b"])
    expect(visibleOn(drawings, "4h")).toEqual([])
  })
})
