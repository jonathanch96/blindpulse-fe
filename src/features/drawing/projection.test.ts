import { describe, expect, it } from "vitest"

import { buildScale } from "@/lib/chart-math"
import { buildProjection, magnetRadius, snapAnchor } from "@/features/drawing/projection"
import type { ChartBar } from "@/features/chart/types"

const scale = buildScale("auto", 100, 200, 400, 150)
const projection = buildProjection(scale, 10, 0)

const bar = (index: number, open: string, high: string, low: string, close: string): ChartBar => ({
  index,
  open,
  high,
  low,
  close,
  volume: "1000",
  forming: false,
})

const bars = [
  bar(0, "150.00000", "160.00000", "140.00000", "155.00000"),
  bar(1, "155.00000", "170.00000", "150.00000", "168.00000"),
  bar(2, "168.00000", "175.00000", "165.00000", "172.00000"),
]

describe("buildProjection", () => {
  it("maps a bar index to the centre of its slot", () => {
    expect(projection.toX(0)).toBe(5)
    expect(projection.toX(2)).toBe(25)
  })

  it("round-trips an index through a pixel", () => {
    expect(projection.toIndex(projection.toX(7))).toBe(7)
  })

  it("survives a zero slot rather than dividing by it", () => {
    const degenerate = buildProjection(scale, 0, 0)
    expect(Number.isFinite(degenerate.toX(3))).toBe(true)
    expect(Number.isFinite(degenerate.toIndex(30))).toBe(true)
  })
})

describe("snapAnchor with magnet on", () => {
  // The precision story. An anchor at "the pixel my mouse was over" carries a price with fourteen
  // meaningless decimals; one snapped to a bar's actual high carries the exact string the server
  // sent, because it is *copied* rather than computed.
  it("copies the exact OHLC string rather than a rounded pointer price", () => {
    const nearHigh = { x: projection.toX(1), y: projection.toY("170.00000") + 2 }
    expect(snapAnchor(nearHigh, bars, projection, true)).toEqual({ index: 1, price: "170.00000" })
  })

  it("picks the nearest of the four, not always the high", () => {
    const nearLow = { x: projection.toX(1), y: projection.toY("150.00000") - 3 }
    expect(snapAnchor(nearLow, bars, projection, true).price).toBe("150.00000")
  })

  // A weak magnet. A strong one always snaps, which on a quiet feed drags the anchor the length
  // of the pane to reach a bar that never traded near the click — the line lands somewhere the
  // trader did not point at, and the tool reads as broken.
  it("leaves the pointer price alone when no OHLC is near enough", () => {
    const farFromAnyLevel = { x: projection.toX(0), y: projection.toY("160.00000") - magnetRadius * 4 }
    const anchor = snapAnchor(farFromAnyLevel, bars, projection, true)
    expect([bars[0]!.open, bars[0]!.high, bars[0]!.low, bars[0]!.close]).not.toContain(anchor.price)
  })

  it("still snaps just inside the threshold", () => {
    const justInside = { x: projection.toX(0), y: projection.toY("160.00000") - (magnetRadius - 2) }
    expect(snapAnchor(justInside, bars, projection, true).price).toBe("160.00000")
  })

  it("snaps to the bar under the pointer", () => {
    const overSecond = { x: projection.toX(2), y: projection.toY("172.00000") }
    expect(snapAnchor(overSecond, bars, projection, true).index).toBe(2)
  })

  // Off the end of the window the pointer still has to produce a usable anchor rather than one
  // pointing at a bar that does not exist.
  it("clamps to the window rather than anchoring past the last bar", () => {
    const beyond = { x: 5_000, y: 100 }
    expect(snapAnchor(beyond, bars, projection, true).index).toBe(2)
    expect(snapAnchor({ x: -500, y: 100 }, bars, projection, true).index).toBe(0)
  })
})

describe("snapAnchor with magnet off", () => {
  it("takes the price under the pointer, at the display scale", () => {
    const anchor = snapAnchor({ x: projection.toX(1), y: 200 }, bars, projection, false)
    expect(anchor.index).toBe(1)
    // y=200 is the midpoint of a 100–200 pane, so 150.
    expect(anchor.price).toBe("150.00000")
  })

  it("still anchors to a bar index rather than a fractional position", () => {
    const anchor = snapAnchor({ x: 13, y: 200 }, bars, projection, false)
    expect(Number.isInteger(anchor.index)).toBe(true)
  })
})

describe("snapAnchor with no bars", () => {
  it("produces an anchor rather than throwing on an empty chart", () => {
    const anchor = snapAnchor({ x: 50, y: 200 }, [], projection, true)
    expect(Number.isInteger(anchor.index)).toBe(true)
    expect(anchor.price).toMatch(/^\d+\.\d+$/)
  })
})
