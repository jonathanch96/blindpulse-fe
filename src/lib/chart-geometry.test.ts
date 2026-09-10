import { describe, expect, it } from "vitest"

import {
  distanceToLine,
  distanceToPolyline,
  distanceToRay,
  distanceToRect,
  distanceToSegment,
  simplifyStroke,
} from "@/lib/chart-geometry"

const origin = { x: 0, y: 0 }
const right = { x: 100, y: 0 }

describe("distanceToSegment", () => {
  it("measures perpendicular distance above the middle", () => {
    expect(distanceToSegment({ x: 50, y: 10 }, origin, right)).toBe(10)
  })

  // The clamp is what stops a short trendline being selectable from across the chart: past the
  // end, the nearest point on the segment is the endpoint, not the infinite line.
  it("clamps past the end rather than measuring to the infinite line", () => {
    expect(distanceToSegment({ x: 200, y: 0 }, origin, right)).toBe(100)
  })

  it("clamps before the start too", () => {
    expect(distanceToSegment({ x: -30, y: 40 }, origin, right)).toBe(50)
  })

  it("degenerates to a point distance when both ends coincide", () => {
    expect(distanceToSegment({ x: 3, y: 4 }, origin, origin)).toBe(5)
  })
})

describe("distanceToLine", () => {
  // The extended line's whole point is that it does not stop at its anchors, so it must stay
  // selectable well beyond them.
  it("stays close past the end of the anchors", () => {
    expect(distanceToLine({ x: 5000, y: 3 }, origin, right)).toBeCloseTo(3)
  })

  // Perpendicular, not vertical: on the diagonal y = x the point (0, 10) is 10/√2 away, not 10.
  it("measures perpendicular distance on a diagonal", () => {
    expect(distanceToLine({ x: 0, y: 10 }, origin, { x: 10, y: 10 })).toBeCloseTo(10 / Math.SQRT2)
  })
})

describe("distanceToRay", () => {
  it("extends forward", () => {
    expect(distanceToRay({ x: 900, y: 4 }, origin, right)).toBeCloseTo(4)
  })

  // A ray drawn to the right is not a line: behind its origin the nearest point is the origin, so
  // it must not answer clicks from the left of where the trader started it.
  it("does not extend backward", () => {
    expect(distanceToRay({ x: -60, y: 0 }, origin, right)).toBe(60)
  })
})

describe("distanceToRect", () => {
  it("is zero inside the box", () => {
    expect(distanceToRect({ x: 5, y: 5 }, origin, { x: 10, y: 10 })).toBe(0)
  })

  it("measures to the nearest edge outside it", () => {
    expect(distanceToRect({ x: 15, y: 5 }, origin, { x: 10, y: 10 })).toBe(5)
  })

  it("measures to the corner diagonally outside it", () => {
    expect(distanceToRect({ x: 13, y: 14 }, origin, { x: 10, y: 10 })).toBe(5)
  })

  it("does not care which corner the anchors are", () => {
    expect(distanceToRect({ x: 15, y: 5 }, { x: 10, y: 10 }, origin)).toBe(5)
  })
})

describe("distanceToPolyline", () => {
  it("takes the nearest segment", () => {
    const points = [origin, { x: 50, y: 0 }, { x: 50, y: 50 }]
    expect(distanceToPolyline({ x: 55, y: 25 }, points)).toBe(5)
  })

  it("handles a single point", () => {
    expect(distanceToPolyline({ x: 3, y: 4 }, [origin])).toBe(5)
  })

  it("is unreachable for an empty path rather than zero", () => {
    expect(distanceToPolyline(origin, [])).toBe(Number.POSITIVE_INFINITY)
  })
})

describe("simplifyStroke", () => {
  // A brush stroke arrives as one point per pointer event. Storing every one of them means
  // hit-testing and redrawing hundreds of anchors for a short flick.
  it("collapses a straight run to its endpoints", () => {
    const straight = Array.from({ length: 50 }, (_, i) => ({ x: i * 2, y: 0 }))
    expect(simplifyStroke(straight)).toEqual([{ x: 0, y: 0 }, { x: 98, y: 0 }])
  })

  it("keeps a corner that the trader actually drew", () => {
    const bent = [origin, { x: 50, y: 0 }, { x: 50, y: 50 }]
    expect(simplifyStroke(bent)).toEqual(bent)
  })

  it("leaves a two-point stroke alone", () => {
    expect(simplifyStroke([origin, right])).toEqual([origin, right])
  })

  it("keeps the first and last point whatever it drops in between", () => {
    const wobbly = Array.from({ length: 200 }, (_, i) => ({ x: i, y: Math.sin(i / 6) * 20 }))
    const thinned = simplifyStroke(wobbly)
    expect(thinned[0]).toEqual(wobbly[0])
    expect(thinned[thinned.length - 1]).toEqual(wobbly[wobbly.length - 1])
    expect(thinned.length).toBeLessThan(wobbly.length)
  })
})
