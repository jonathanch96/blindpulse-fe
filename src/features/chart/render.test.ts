import { describe, expect, it } from "vitest"

import { computeLayout, drawFrame, toPlotBars } from "@/features/chart/render"
import { defaultOverlays, type ChartBar } from "@/features/chart/types"
import { createRecordingContext, hasAlpha, type RecordingContext } from "@/test/recording-canvas"

// Review finding FE-03-2. The chart's numeric kernels were tested thoroughly and the layer that
// composes them was not — which is exactly how `withAlpha` stayed broken for a whole slice, making
// every "tinted" fill in the chart fully opaque. A bug in a rendering concern is invisible to every
// kernel test and only shows up if you look at a screenshot.
//
// These assert on what the renderer *asked the canvas for*, which is the level the bug lived at.

const palette = {
  bullish: "lab(80% -35 -29)",
  bearish: "lab(60% 55 20)",
  telemetry: "lab(79% -35 -29)",
  foreground: "lab(97% 0 -1)",
  muted: "lab(70% 0 0)",
  seam: "lab(20% 0 0)",
  panel: "lab(14% 0 0)",
}

function bar(index: number, open: number, high: number, low: number, close: number, forming = false): ChartBar {
  return {
    index,
    open: open.toFixed(5),
    high: high.toFixed(5),
    low: low.toFixed(5),
    close: close.toFixed(5),
    volume: "1000",
    forming,
  }
}

function render(bars: ChartBar[], overlays = defaultOverlays): RecordingContext {
  const ctx = createRecordingContext()
  const plot = toPlotBars(bars)
  const layout = computeLayout(800, 600, overlays, plot.length)
  drawFrame(ctx, { bars: plot, layout, palette, scaleMode: "auto", overlays })
  return ctx
}

const series = [
  bar(0, 100, 105, 99, 104),
  bar(1, 104, 108, 103, 107),
  bar(2, 107, 109, 101, 102),
  bar(3, 102, 106, 100, 105),
]

describe("drawFrame", () => {
  it("clears before it paints, so a redraw does not composite onto the last frame", () => {
    const ctx = render(series)
    expect(ctx.calls[0]?.op).toBe("clearRect")
  })

  it("draws nothing but the clear when there are no bars", () => {
    const ctx = render([])
    expect(ctx.calls.map((call) => call.op)).toEqual(["clearRect"])
  })

  // A solid candle asserts a period that has closed. A forming bar has not, and filling it would
  // show the trader time they have not been given — the one drawing rule with a correctness stake.
  it("outlines a forming bar and never fills it", () => {
    const withForming = [...series, bar(4, 105, 111, 104, 110, true)]
    const ctx = render(withForming)

    const strokedRects = ctx.where("strokeRect")
    expect(strokedRects.length, "the forming bar should be outlined").toBeGreaterThan(0)
    expect(strokedRects.some((call) => call.lineDash.length > 0), "the outline should be dashed").toBe(true)

    // Four closed bars means four filled bodies — the forming one must not add a fifth.
    const bodyFills = ctx.where("fillRect").filter((call) => call.args[3]! > 0)
    const candleFills = bodyFills.filter((call) => call.fillStyle === palette.bullish || call.fillStyle === palette.bearish)
    expect(candleFills).toHaveLength(4)
  })

  it("fills a closed bar's body", () => {
    const ctx = render(series)
    const candleFills = ctx.where("fillRect").filter(
      (call) => call.fillStyle === palette.bullish || call.fillStyle === palette.bearish,
    )
    expect(candleFills).toHaveLength(series.length)
  })

  it("colours a bar by direction rather than by position", () => {
    const ctx = render([bar(0, 100, 105, 99, 104), bar(1, 104, 105, 96, 98)])
    const candleFills = ctx.where("fillRect").filter(
      (call) => call.fillStyle === palette.bullish || call.fillStyle === palette.bearish,
    )
    expect(candleFills[0]?.fillStyle, "close above open is bullish").toBe(palette.bullish)
    expect(candleFills[1]?.fillStyle, "close below open is bearish").toBe(palette.bearish)
  })

  // The regression. Volume bars are meant to sit behind price at 28% — they were painted solid,
  // and no test noticed because no test looked at what the fill style actually was.
  it("tints the volume bars rather than painting them solid", () => {
    const ctx = render(series)
    const volumeFills = ctx
      .where("fillRect")
      .filter((call) => call.fillStyle !== palette.bullish && call.fillStyle !== palette.bearish)
    expect(volumeFills.length, "the volume pane should have drawn").toBeGreaterThan(0)
    for (const call of volumeFills) {
      expect(hasAlpha(call.fillStyle), `volume fill ${call.fillStyle} carries no alpha`).toBe(true)
    }
  })

  it("draws the RSI bands dashed and tinted", () => {
    const ctx = render(series)
    const dashed = ctx.where("setLineDash").filter((call) => call.args.length > 0)
    expect(dashed.length, "the 30/70 bands should be dashed").toBeGreaterThan(0)
    const bandStrokes = ctx.calls.filter((call) => call.op === "stroke" && call.lineDash.length > 0)
    expect(bandStrokes.some((call) => hasAlpha(call.strokeStyle))).toBe(true)
  })

  it("labels the price axis", () => {
    const ctx = render(series)
    expect(ctx.texts.length).toBeGreaterThan(0)
    for (const label of ctx.texts) {
      expect(label.text).toMatch(/^\d/)
    }
  })

  // A date on the axis would identify the window as surely as naming the instrument (NFR-05). The
  // axis is price-only by design, and this is the renderer-level guard on that.
  it("never writes a date onto the chart", () => {
    const ctx = render(series)
    for (const label of ctx.texts) {
      expect(label.text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
      expect(label.text).not.toMatch(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/)
    }
  })

  it("skips the panes the overlays turn off", () => {
    const withVolume = render(series, { ...defaultOverlays, showVolume: true })
    const withoutVolume = render(series, { ...defaultOverlays, showVolume: false, showRsi: false })
    expect(withoutVolume.calls.length).toBeLessThan(withVolume.calls.length)
  })
})

describe("computeLayout", () => {
  it("gives the panes it is asked for and nothing else", () => {
    const full = computeLayout(800, 600, defaultOverlays, 100)
    expect(full.volumePaneHeight).toBeGreaterThan(0)
    expect(full.rsiPaneHeight).toBeGreaterThan(0)

    const bare = computeLayout(800, 600, { ...defaultOverlays, showVolume: false, showRsi: false }, 100)
    expect(bare.volumePaneHeight).toBe(0)
    expect(bare.rsiPaneHeight).toBe(0)
    expect(bare.mainPaneHeight).toBeGreaterThan(full.mainPaneHeight)
  })

  // A body narrower than a pixel disappears; one wider than its slot overlaps its neighbour.
  it("keeps a candle body visible and inside its slot at any bar count", () => {
    for (const count of [1, 10, 500, 5000]) {
      const layout = computeLayout(800, 600, defaultOverlays, count)
      expect(layout.bodyWidth).toBeGreaterThanOrEqual(1)
      expect(layout.bodyWidth).toBeLessThanOrEqual(Math.max(layout.slot, 1))
    }
  })

  it("survives a zero-sized canvas rather than producing NaN", () => {
    const layout = computeLayout(0, 0, defaultOverlays, 0)
    for (const [name, value] of Object.entries(layout)) {
      expect(Number.isFinite(value), `${name} is not finite`).toBe(true)
    }
  })
})
