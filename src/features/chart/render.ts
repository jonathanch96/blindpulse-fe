import { buildScale, ema, rsi, toPlotValue, type ScaleMode } from "@/lib/chart-math"
import { readPalette, withAlpha, type ChartPalette } from "@/features/chart/theme"
import type { ChartBar, ChartOverlays } from "@/features/chart/types"

export type PlotBar = {
  index: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  forming: boolean
}

export type Layout = {
  width: number
  height: number
  mainPaneHeight: number
  volumePaneHeight: number
  rsiPaneHeight: number
  axisWidth: number
  slot: number
  bodyWidth: number
}

export type Frame = {
  bars: PlotBar[]
  layout: Layout
  palette: ChartPalette
  scaleMode: ScaleMode
  overlays: ChartOverlays
}

/** Converts the wire bars into plot values once per window change rather than once per frame. */
export function toPlotBars(bars: ChartBar[]): PlotBar[] {
  return bars.map((bar) => ({
    index: bar.index,
    open: toPlotValue(bar.open),
    high: toPlotValue(bar.high),
    low: toPlotValue(bar.low),
    close: toPlotValue(bar.close),
    volume: toPlotValue(bar.volume),
    forming: bar.forming,
  }))
}

export function computeLayout(width: number, height: number, overlays: ChartOverlays, barCount: number): Layout {
  const axisWidth = 64
  const plotWidth = Math.max(1, width - axisWidth)
  const volumePaneHeight = overlays.showVolume ? height * 0.14 : 0
  const rsiPaneHeight = overlays.showRsi ? height * 0.2 : 0
  const mainPaneHeight = Math.max(1, height - volumePaneHeight - rsiPaneHeight)
  const slot = plotWidth / Math.max(1, barCount)
  return {
    width,
    height,
    mainPaneHeight,
    volumePaneHeight,
    rsiPaneHeight,
    axisWidth,
    slot,
    // A body narrower than a pixel disappears; a body wider than its slot overlaps its neighbour.
    bodyWidth: Math.max(1, Math.min(slot * 0.66, slot - 1)),
  }
}

/**
 * Draws one complete frame: candles, volume, EMAs, RSI and the price axis.
 *
 * Everything is recomputed from the bar window each call. The spike behind ADR 0001 measured this
 * at 4.4 ms p99 for 500 bars with every overlay on, against a 16.7 ms budget, so there is no
 * incremental-update machinery here to get subtly wrong.
 */
export function drawFrame(ctx: CanvasRenderingContext2D, frame: Frame): void {
  const { bars, layout, palette, scaleMode, overlays } = frame
  ctx.clearRect(0, 0, layout.width, layout.height)
  if (bars.length === 0) return

  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (const bar of bars) {
    if (bar.low < low) low = bar.low
    if (bar.high > high) high = bar.high
  }
  if (!Number.isFinite(low) || !Number.isFinite(high)) return
  const pad = (high - low) * 0.06 || 1
  const scale = buildScale(scaleMode, low - pad, high + pad, layout.mainPaneHeight, bars[0]!.close)

  drawGrid(ctx, layout, palette, scale)
  drawCandles(ctx, bars, layout, palette, scale)
  if (overlays.showVolume) drawVolume(ctx, bars, layout, palette)
  drawEmas(ctx, bars, layout, palette, scale, overlays.emaPeriods)
  if (overlays.showRsi) drawRsi(ctx, bars, layout, palette)
  drawAxis(ctx, layout, palette, scale)
}

function xFor(index: number, layout: Layout): number {
  return index * layout.slot + layout.slot / 2
}

function drawGrid(ctx: CanvasRenderingContext2D, layout: Layout, palette: ChartPalette, scale: ReturnType<typeof buildScale>) {
  ctx.strokeStyle = palette.seam
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const tick of scale.ticks) {
    // The half-pixel offset keeps a 1px line on one row of pixels instead of straddling two and
    // rendering as a 2px blur.
    const y = Math.round(scale.toY(tick)) + 0.5
    ctx.moveTo(0, y)
    ctx.lineTo(layout.width - layout.axisWidth, y)
  }
  const panes = [layout.mainPaneHeight, layout.mainPaneHeight + layout.volumePaneHeight]
  for (const y of panes) {
    ctx.moveTo(0, Math.round(y) + 0.5)
    ctx.lineTo(layout.width - layout.axisWidth, Math.round(y) + 0.5)
  }
  ctx.stroke()
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  bars: PlotBar[],
  layout: Layout,
  palette: ChartPalette,
  scale: ReturnType<typeof buildScale>,
) {
  for (const bar of bars) {
    const rising = bar.close >= bar.open
    const color = rising ? palette.bullish : palette.bearish
    const x = xFor(bar.index - bars[0]!.index, layout)
    const top = scale.toY(Math.max(bar.open, bar.close))
    const bottom = scale.toY(Math.min(bar.open, bar.close))

    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) + 0.5, scale.toY(bar.high))
    ctx.lineTo(Math.round(x) + 0.5, scale.toY(bar.low))
    ctx.stroke()

    const bodyHeight = Math.max(1, bottom - top)
    if (bar.forming) {
      // A forming bar is outlined, never filled. A solid candle asserts a period that has closed,
      // and this one has not — drawing it filled would show the trader time they have not been
      // given.
      ctx.setLineDash([2, 2])
      ctx.strokeRect(x - layout.bodyWidth / 2, top, layout.bodyWidth, bodyHeight)
      ctx.setLineDash([])
    } else {
      ctx.fillStyle = color
      ctx.fillRect(x - layout.bodyWidth / 2, top, layout.bodyWidth, bodyHeight)
    }
  }
}

function drawVolume(ctx: CanvasRenderingContext2D, bars: PlotBar[], layout: Layout, palette: ChartPalette) {
  let peak = 0
  for (const bar of bars) if (bar.volume > peak) peak = bar.volume
  if (peak <= 0) return
  const base = layout.mainPaneHeight + layout.volumePaneHeight
  for (const bar of bars) {
    const height = (bar.volume / peak) * (layout.volumePaneHeight * 0.9)
    ctx.fillStyle = withAlpha(bar.close >= bar.open ? palette.bullish : palette.bearish, 0.28)
    const x = xFor(bar.index - bars[0]!.index, layout)
    ctx.fillRect(x - layout.bodyWidth / 2, base - height, layout.bodyWidth, height)
  }
}

function drawEmas(
  ctx: CanvasRenderingContext2D,
  bars: PlotBar[],
  layout: Layout,
  palette: ChartPalette,
  scale: ReturnType<typeof buildScale>,
  periods: number[],
) {
  const closes = bars.map((bar) => bar.close)
  // Telemetry cyan, then neutral tones. EMAs are structure, not direction, so they deliberately do
  // not use the bull/bear palette — those colours mean profit and loss everywhere else.
  const colors = [palette.telemetry, palette.foreground, palette.muted]
  periods.forEach((period, position) => {
    const series = ema(closes, period)
    ctx.strokeStyle = colors[position % colors.length]!
    ctx.lineWidth = 1.25
    ctx.beginPath()
    series.forEach((value, index) => {
      const x = xFor(index, layout)
      const y = scale.toY(value)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  })
}

function drawRsi(ctx: CanvasRenderingContext2D, bars: PlotBar[], layout: Layout, palette: ChartPalette) {
  const top = layout.mainPaneHeight + layout.volumePaneHeight
  const height = layout.rsiPaneHeight
  const series = rsi(bars.map((bar) => bar.close), 14)
  const toY = (value: number) => top + height - (value / 100) * height

  ctx.strokeStyle = withAlpha(palette.muted, 0.4)
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  for (const level of [30, 70]) {
    const y = Math.round(toY(level)) + 0.5
    ctx.moveTo(0, y)
    ctx.lineTo(layout.width - layout.axisWidth, y)
  }
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = palette.telemetry
  ctx.lineWidth = 1.25
  ctx.beginPath()
  let started = false
  series.forEach((value, index) => {
    // The warmup bars are NaN by design; skipping them draws nothing rather than a line pretending
    // the indicator was defined before it was.
    if (Number.isNaN(value)) return
    const x = xFor(index, layout)
    const y = toY(value)
    if (!started) {
      ctx.moveTo(x, y)
      started = true
    } else {
      ctx.lineTo(x, y)
    }
  })
  ctx.stroke()
}

function drawAxis(ctx: CanvasRenderingContext2D, layout: Layout, palette: ChartPalette, scale: ReturnType<typeof buildScale>) {
  const x = layout.width - layout.axisWidth + 6
  ctx.fillStyle = palette.muted
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textBaseline = "middle"
  for (const tick of scale.ticks) {
    ctx.fillText(scale.format(tick), x, scale.toY(tick))
  }
}

export { readPalette }
