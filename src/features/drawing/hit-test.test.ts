import { describe, expect, it } from "vitest"

import { buildScale } from "@/lib/chart-math"
import { buildProjection } from "@/features/drawing/projection"
import { drawingShape, handleIndexAt, hitTest } from "@/features/drawing/hit-test"
import type { Drawing } from "@/features/drawing/types"

// A 400px-tall pane over prices 100–200, and bars 10px apart starting at index 0. Price 200 is at
// y=0 and price 100 at y=400, so every expectation below can be read off by hand.
const scale = buildScale("auto", 100, 200, 400, 150)
const projection = buildProjection(scale, 10, 0)
const plotWidth = 600
const plotHeight = 400

const line = (id: string, anchors: [number, string][], kind: Drawing["kind"] = "trendline"): Drawing => ({
  id,
  kind,
  timeframe: "15m",
  anchors: anchors.map(([index, price]) => ({ index, price })),
})

describe("drawingShape", () => {
  // What a trader means by "a level" is a line across the chart, not a line between two clicks.
  // If it is drawn full width it must be clickable full width, or it reads as broken.
  it("runs a horizontal across the whole plot, not just to its anchor", () => {
    const shape = drawingShape(line("h", [[5, "150"]], "horizontal"), projection, plotWidth, plotHeight)
    expect(shape).toMatchObject({ form: "segment", a: { x: 0, y: 200 }, b: { x: plotWidth, y: 200 } })
  })

  it("runs a vertical the height of the pane", () => {
    const shape = drawingShape(line("v", [[5, "150"]], "vertical"), projection, plotWidth, plotHeight)
    expect(shape).toMatchObject({ form: "segment", a: { y: 0 }, b: { y: plotHeight } })
  })

  it("gives a fib its levels, ending at the right edge", () => {
    const shape = drawingShape(line("f", [[2, "100"], [12, "200"]], "fib"), projection, plotWidth, plotHeight)
    expect(shape?.form).toBe("levels")
    if (shape?.form === "levels") {
      expect(shape.right).toBe(plotWidth)
      // Seven PRD levels, 0 on the second anchor (price 200, y=0) and 1 on the first (100, y=400).
      expect(shape.ys).toHaveLength(7)
      expect(shape.ys[0]).toBeCloseTo(0)
      expect(shape.ys[6]).toBeCloseTo(400)
    }
  })

  it("returns nothing for a shape that has not collected its anchors yet", () => {
    expect(drawingShape(line("t", [[1, "150"]]), projection, plotWidth, plotHeight)).toBeNull()
  })
})

describe("hitTest", () => {
  const trend = line("t1", [[0, "150"], [20, "150"]])

  it("selects a line the pointer is on", () => {
    expect(hitTest([trend], { x: 100, y: 200 }, projection, plotWidth, plotHeight)).toBe("t1")
  })

  it("misses a line the pointer is well clear of", () => {
    expect(hitTest([trend], { x: 100, y: 260 }, projection, plotWidth, plotHeight)).toBeNull()
  })

  // The clamp in distanceToSegment: a trendline that ends must not be selectable from beyond it.
  it("does not select a trendline past its end", () => {
    expect(hitTest([trend], { x: 560, y: 200 }, projection, plotWidth, plotHeight)).toBeNull()
  })

  it("does select an extended line past its end, which is the point of it", () => {
    const extended = line("e1", [[0, "150"], [20, "150"]], "extended")
    expect(hitTest([extended], { x: 560, y: 200 }, projection, plotWidth, plotHeight)).toBe("e1")
  })

  // A ray drawn rightward is not a line: behind its origin there is nothing to click.
  it("does not select a ray behind its origin", () => {
    const ray = line("r1", [[20, "150"], [40, "150"]], "ray")
    expect(hitTest([ray], { x: 600, y: 200 }, projection, plotWidth, plotHeight)).toBe("r1")
    expect(hitTest([ray], { x: 10, y: 200 }, projection, plotWidth, plotHeight)).toBeNull()
  })

  it("selects a zone from inside it", () => {
    const zone = line("z1", [[0, "160"], [20, "140"]], "zone")
    expect(hitTest([zone], { x: 100, y: 200 }, projection, plotWidth, plotHeight)).toBe("z1")
  })

  // The last drawing is the one on top, so it is the one a click on the overlap should get.
  it("gives an overlap to the drawing drawn last", () => {
    const under = line("under", [[0, "150"], [20, "150"]])
    const over = line("over", [[0, "150"], [20, "150"]])
    expect(hitTest([under, over], { x: 100, y: 200 }, projection, plotWidth, plotHeight)).toBe("over")
  })

  it("selects nothing on an empty chart", () => {
    expect(hitTest([], { x: 100, y: 200 }, projection, plotWidth, plotHeight)).toBeNull()
  })
})

describe("handleIndexAt", () => {
  const trend = line("t1", [[0, "150"], [20, "160"]])

  it("finds the handle the pointer is on", () => {
    // Anchor 0 is at index 0 → x = 5, price 150 → y = 200.
    expect(handleIndexAt(trend, { x: 5, y: 200 }, projection)).toBe(0)
    // Anchor 1 is at index 20 → x = 205, price 160 → y = 160.
    expect(handleIndexAt(trend, { x: 205, y: 160 }, projection)).toBe(1)
  })

  it("reports no handle mid-line, so dragging there moves the whole drawing", () => {
    expect(handleIndexAt(trend, { x: 105, y: 180 }, projection)).toBe(-1)
  })

  it("takes the nearer of two close handles", () => {
    const tight = line("t2", [[0, "150"], [1, "150"]])
    expect(handleIndexAt(tight, { x: 14, y: 200 }, projection)).toBe(1)
  })
})
