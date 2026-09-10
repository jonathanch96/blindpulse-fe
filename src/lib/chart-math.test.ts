import { describe, expect, it } from "vitest"

import { buildScale, ema, niceTicks, rsi, toPlotValue } from "@/lib/chart-math"

describe("toPlotValue", () => {
  it("never returns a non-finite coordinate", () => {
    // A NaN reaching a canvas call silently drops the whole path, so a bad value must become a
    // number rather than propagate.
    expect(toPlotValue("146.59")).toBe(146.59)
    expect(toPlotValue("not-a-price")).toBe(0)
    expect(toPlotValue("")).toBe(0)
  })
})

describe("buildScale", () => {
  it("maps the window extremes to the plot edges", () => {
    const scale = buildScale("auto", 100, 200, 400, 100)
    expect(scale.toY(200)).toBeCloseTo(0)
    expect(scale.toY(100)).toBeCloseTo(400)
    expect(scale.toY(150)).toBeCloseTo(200)
  })

  // A log scale is what makes a 10% move the same size at any price level.
  it("spaces equal ratios equally in log mode", () => {
    const scale = buildScale("log", 100, 400, 400, 100)
    const firstDouble = scale.toY(100) - scale.toY(200)
    const secondDouble = scale.toY(200) - scale.toY(400)
    expect(firstDouble).toBeCloseTo(secondDouble, 6)
  })

  // Blinded prices are always positive, but a degenerate window must not produce NaN coordinates
  // and a blank chart.
  it("falls back to linear rather than emitting NaN for a non-positive log window", () => {
    const scale = buildScale("log", -5, 10, 400, 1)
    expect(Number.isFinite(scale.toY(5))).toBe(true)
  })

  it("reads out signed returns in percent mode", () => {
    const scale = buildScale("percent", 90, 110, 400, 100)
    expect(scale.format(110)).toBe("+10.00%")
    expect(scale.format(90)).toBe("-10.00%")
    expect(scale.format(100)).toBe("+0.00%")
  })

  it("degrades safely when the window has no range", () => {
    const scale = buildScale("auto", 100, 100, 400, 100)
    expect(Number.isFinite(scale.toY(100))).toBe(true)
    expect(scale.ticks).toEqual([])
  })
})

describe("niceTicks", () => {
  it("lands on round numbers rather than even pixel intervals", () => {
    expect(niceTicks(0, 100, 6)).toEqual([0, 20, 40, 60, 80, 100])
  })

  it("returns nothing for an inverted range", () => {
    expect(niceTicks(100, 0, 6)).toEqual([])
  })
})

describe("ema", () => {
  // Defined from bar 0, because a replay advances one bar at a time and an indicator that only
  // starts after 200 bars is blank exactly when the first trade is being decided.
  it("is defined for every bar", () => {
    const series = ema([10, 11, 12, 13], 20)
    expect(series).toHaveLength(4)
    expect(series.every(Number.isFinite)).toBe(true)
  })

  it("tracks a constant series exactly", () => {
    expect(ema([5, 5, 5, 5, 5], 3)).toEqual([5, 5, 5, 5, 5])
  })

  it("weights recent values more heavily than a long average would", () => {
    const rising = ema([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3)
    expect(rising[rising.length - 1]).toBeGreaterThan(8)
  })
})

describe("rsi", () => {
  it("leaves the warmup bars undefined rather than drawing a meaningless line", () => {
    const series = rsi([1, 2, 3], 14)
    expect(series.every((value) => Number.isNaN(value))).toBe(true)
  })

  it("reports 100 for an unbroken advance instead of dividing by zero", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i)
    const series = rsi(closes, 14)
    expect(series[series.length - 1]).toBe(100)
  })

  it("stays within 0 and 100 on noisy input", () => {
    const closes = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i / 3) * 10 + (i % 7))
    for (const value of rsi(closes, 14)) {
      if (Number.isNaN(value)) continue
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(100)
    }
  })
})
