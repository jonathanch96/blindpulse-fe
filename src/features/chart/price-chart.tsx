"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { computeLayout, drawFrame, readPalette, toPlotBars } from "@/features/chart/render"
import { defaultOverlays, type ChartBar, type ChartOverlays, type ScaleMode } from "@/features/chart/types"
import { withAlpha } from "@/features/chart/theme"

// Two canvases, stacked. The price layer redraws when the bar window, size, scale mode or overlays
// change; the crosshair layer redraws on every pointer move. ADR 0001 measured a full price redraw
// at 4.4 ms p99, so the split is not needed to hit the frame budget today — it is here because
// slice 03F's drag interactions fire on every pointer event, and paying for a candle redraw per
// mouse move would spend the headroom this design bought.
export function PriceChart({
  bars,
  scaleMode = "auto",
  overlays = defaultOverlays,
  onReadout,
}: {
  bars: ChartBar[]
  scaleMode?: ScaleMode
  overlays?: ChartOverlays
  onReadout?: (bar: ChartBar | null) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const priceLayer = useRef<HTMLCanvasElement>(null)
  const crosshairLayer = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null)

  const plotBars = useMemo(() => toPlotBars(bars), [bars])

  // Observed rather than polled: the terminal's panes are resizable, and a resize that the chart
  // learns about a frame late shows a stretched canvas.
  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (box) setSize({ width: Math.floor(box.width), height: Math.floor(box.height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const sizeCanvas = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || size.width === 0 || size.height === 0) return null
    // Device-pixel-ratio aware: on a 2x display a canvas sized only in CSS pixels renders every
    // hairline and every label soft.
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.floor(size.width * ratio)
    canvas.height = Math.floor(size.height * ratio)
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const ctx = canvas.getContext("2d")
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0)
    return ctx
  }, [size])

  useEffect(() => {
    const ctx = sizeCanvas(priceLayer.current)
    if (!ctx) return
    const palette = readPalette(host.current)
    const layout = computeLayout(size.width, size.height, overlays, plotBars.length)
    drawFrame(ctx, { bars: plotBars, layout, palette, scaleMode, overlays })
  }, [plotBars, size, scaleMode, overlays, sizeCanvas])

  useEffect(() => {
    const ctx = sizeCanvas(crosshairLayer.current)
    if (!ctx) return
    ctx.clearRect(0, 0, size.width, size.height)
    if (!hover || plotBars.length === 0) return
    const palette = readPalette(host.current)
    const layout = computeLayout(size.width, size.height, overlays, plotBars.length)
    ctx.strokeStyle = withAlpha(palette.telemetry, 0.6)
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(hover.x) + 0.5, 0)
    ctx.lineTo(Math.round(hover.x) + 0.5, size.height)
    ctx.moveTo(0, Math.round(hover.y) + 0.5)
    ctx.lineTo(layout.width - layout.axisWidth, Math.round(hover.y) + 0.5)
    ctx.stroke()
    ctx.setLineDash([])
  }, [hover, plotBars, size, overlays, sizeCanvas])

  // Pointer events rather than mouse events, so one code path serves mouse, touch and pen —
  // mobile is a first-class target here (FR-UI-12), not an afterthought.
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    setHover({ x, y: event.clientY - rect.top })
    if (!onReadout || plotBars.length === 0) return
    const layout = computeLayout(size.width, size.height, overlays, plotBars.length)
    const position = Math.floor(x / Math.max(layout.slot, 0.0001))
    onReadout(bars[Math.min(Math.max(position, 0), bars.length - 1)] ?? null)
  }

  return (
    <div
      ref={host}
      className="relative h-full w-full touch-none"
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        setHover(null)
        onReadout?.(null)
      }}
    >
      <canvas ref={priceLayer} className="absolute inset-0" aria-hidden="true" />
      <canvas ref={crosshairLayer} className="absolute inset-0" aria-hidden="true" />
      {/* The canvas is opaque to assistive technology, so the same information is stated in text.
          A screen-reader user gets the state of the session, not silence. */}
      <p className="sr-only" role="status">
        {bars.length === 0
          ? "No bars released yet"
          : `${bars.length} bars released. Latest close ${bars[bars.length - 1]?.close}${
              bars[bars.length - 1]?.forming ? ", still forming" : ""
            }.`}
      </p>
    </div>
  )
}
