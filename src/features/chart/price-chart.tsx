"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { computeLayout, drawFrame, readPalette, toPlotBars } from "@/features/chart/render"
import { defaultOverlays, type ChartBar, type ChartOverlays, type ScaleMode } from "@/features/chart/types"
import { withAlpha } from "@/features/chart/theme"
import Decimal from "decimal.js"

import { buildScale } from "@/lib/chart-math"
import { simplifyStroke, type Pixel } from "@/lib/chart-geometry"
import { drawDrawings } from "@/features/drawing/render"
import { buildProjection, snapAnchor, type Projection } from "@/features/drawing/projection"
import { handleIndexAt, hitTest } from "@/features/drawing/hit-test"
import { translateAnchors as translate } from "@/features/drawing/reducer"
import { toolSpecs, type Anchor, type Drawing, type DrawingKind, type DrawingTool } from "@/features/drawing/types"

// Two canvases, stacked. The price layer redraws when the bar window, size, scale mode or overlays
// change; the overlay layer carries the crosshair and every drawing, and redraws on pointer moves.
// ADR 0001 measured a full price redraw at 4.4 ms p99, so the split is not needed to hit the frame
// budget for candles alone — it is here because drag interactions fire on every pointer event, and
// paying for a candle redraw per mouse move would spend the headroom that design bought.

export type DrawingSurface = {
  drawings: Drawing[]
  draft: Anchor[]
  draftKind: DrawingKind | null
  tool: DrawingTool
  magnet: boolean
  /** The timeframe the trader is on; a new drawing is stamped with it. */
  timeframe: string
  selectedId: string | null
  onPlace: (anchor: Anchor) => void
  onEndStroke: () => void
  onSelect: (id: string | null) => void
  onReplaceAnchors: (id: string, anchors: Anchor[]) => void
}

export function PriceChart({
  bars,
  scaleMode = "auto",
  overlays = defaultOverlays,
  onReadout,
  surface,
}: {
  bars: ChartBar[]
  scaleMode?: ScaleMode
  overlays?: ChartOverlays
  onReadout?: (bar: ChartBar | null) => void
  surface?: DrawingSurface
}) {
  const host = useRef<HTMLDivElement>(null)
  const priceLayer = useRef<HTMLCanvasElement>(null)
  const overlayLayer = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hover, setHover] = useState<Pixel | null>(null)
  // Drag state lives in a ref, not in state: it changes on every pointer event and nothing about
  // it needs to re-render React. The redraw is driven by `hover` alone.
  const drag = useRef<{ id: string; handle: number; origin: Anchor[]; from: Anchor } | null>(null)
  const stroke = useRef<Pixel[]>([])

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

  const layout = useMemo(
    () => computeLayout(size.width, size.height, overlays, plotBars.length),
    [size, overlays, plotBars.length],
  )

  // One projection, shared by rendering, hit-testing and anchoring. Two would be two chances for
  // the chart and the pointer to disagree about where a price is.
  const projection: Projection | null = useMemo(() => {
    if (plotBars.length === 0 || layout.mainPaneHeight <= 0) return null
    let low = Number.POSITIVE_INFINITY
    let high = Number.NEGATIVE_INFINITY
    for (const bar of plotBars) {
      if (bar.low < low) low = bar.low
      if (bar.high > high) high = bar.high
    }
    if (!Number.isFinite(low) || !Number.isFinite(high)) return null
    const pad = (high - low) * 0.06 || 1
    const scale = buildScale(scaleMode, low - pad, high + pad, layout.mainPaneHeight, plotBars[0]!.close)
    return buildProjection(scale, layout.slot, plotBars[0]!.index)
  }, [plotBars, layout, scaleMode])

  useEffect(() => {
    const ctx = sizeCanvas(priceLayer.current)
    if (!ctx) return
    const palette = readPalette(host.current)
    drawFrame(ctx, { bars: plotBars, layout, palette, scaleMode, overlays })
  }, [plotBars, layout, scaleMode, overlays, sizeCanvas])

  useEffect(() => {
    const ctx = sizeCanvas(overlayLayer.current)
    if (!ctx) return
    ctx.clearRect(0, 0, size.width, size.height)
    if (plotBars.length === 0 || !projection) return
    const palette = readPalette(host.current)
    const plotWidth = layout.width - layout.axisWidth

    if (surface) {
      drawDrawings(ctx, {
        drawings: surface.drawings,
        draft: draftDrawing(surface, hover, projection, bars),
        selectedId: surface.selectedId,
        projection,
        palette,
        plotWidth,
        plotHeight: layout.mainPaneHeight,
      })
    }

    if (!hover) return
    ctx.strokeStyle = withAlpha(palette.telemetry, 0.6)
    ctx.setLineDash([4, 4])
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(hover.x) + 0.5, 0)
    ctx.lineTo(Math.round(hover.x) + 0.5, size.height)
    ctx.moveTo(0, Math.round(hover.y) + 0.5)
    ctx.lineTo(plotWidth, Math.round(hover.y) + 0.5)
    ctx.stroke()
    ctx.setLineDash([])
  }, [hover, plotBars, bars, size, layout, projection, surface, sizeCanvas])

  const pointerAt = (event: React.PointerEvent<HTMLDivElement>): Pixel => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!surface || !projection || plotBars.length === 0) return
    const point = pointerAt(event)
    const plotWidth = layout.width - layout.axisWidth
    event.currentTarget.setPointerCapture(event.pointerId)

    if (surface.tool === "cursor") {
      const id = hitTest(surface.drawings, point, projection, plotWidth, layout.mainPaneHeight)
      surface.onSelect(id)
      if (id) {
        const drawing = surface.drawings.find((candidate) => candidate.id === id)!
        // A handle is checked before the body: grabbing an endpoint reshapes the line, which is
        // what someone adjusting a trendline is reaching for.
        drag.current = {
          id,
          handle: handleIndexAt(drawing, point, projection),
          origin: drawing.anchors,
          from: snapAnchor(point, bars, projection, false),
        }
      }
      return
    }

    const anchor = snapAnchor(point, bars, projection, surface.magnet)
    if (surface.tool === "brush") {
      stroke.current = [point]
      return
    }
    surface.onPlace(anchor)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointerAt(event)
    setHover(point)

    if (surface && projection && drag.current) {
      moveDrag(surface, projection, bars, point, drag.current)
      return
    }
    if (surface && projection && surface.tool === "brush" && stroke.current.length > 0) {
      stroke.current.push(point)
      return
    }
    if (!onReadout || plotBars.length === 0) return
    const position = Math.floor(point.x / Math.max(layout.slot, 0.0001))
    onReadout(bars[Math.min(Math.max(position, 0), bars.length - 1)] ?? null)
  }

  const onPointerUp = () => {
    drag.current = null
    if (!surface || !projection) return
    if (surface.tool === "brush" && stroke.current.length > 0) {
      // Thinned before it becomes anchors: a short flick is hundreds of pointer events, and every
      // one kept is an anchor to store, hit-test and redraw forever after.
      for (const point of simplifyStroke(stroke.current)) {
        surface.onPlace(snapAnchor(point, bars, projection, false))
      }
      stroke.current = []
      surface.onEndStroke()
    }
  }

  return (
    <div
      ref={host}
      className="relative h-full w-full touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => surface?.onEndStroke()}
      onPointerLeave={() => {
        setHover(null)
        onReadout?.(null)
      }}
    >
      <canvas ref={priceLayer} className="absolute inset-0" aria-hidden="true" />
      <canvas ref={overlayLayer} className="absolute inset-0" aria-hidden="true" />
      {/* The canvas is opaque to assistive technology, so the same information is stated in text.
          A screen-reader user gets the state of the session, not silence. */}
      <p className="sr-only" role="status">
        {bars.length === 0
          ? "No bars released yet"
          : `${bars.length} bars released. Latest close ${bars[bars.length - 1]?.close}${
              bars[bars.length - 1]?.forming ? ", still forming" : ""
            }.${surface && surface.drawings.length > 0 ? ` ${surface.drawings.length} drawings on the chart.` : ""}`}
      </p>
    </div>
  )
}

/**
 * The preview of the drawing currently being placed.
 *
 * Built from the anchors already committed plus the pointer, so a two-point tool shows the line it
 * would create before the second click rather than nothing at all.
 */
function draftDrawing(
  surface: DrawingSurface,
  hover: Pixel | null,
  projection: Projection,
  bars: ChartBar[],
): Drawing | null {
  if (!surface.draftKind || surface.draft.length === 0) return null
  const spec = toolSpecs[surface.draftKind]
  const anchors = [...surface.draft]
  if (hover && !spec.freehand && anchors.length < spec.anchors) {
    anchors.push(snapAnchor(hover, bars, projection, surface.magnet))
  }
  return { id: "__draft__", kind: surface.draftKind, timeframe: surface.timeframe, anchors }
}

function moveDrag(
  surface: DrawingSurface,
  projection: Projection,
  bars: ChartBar[],
  point: Pixel,
  active: { id: string; handle: number; origin: Anchor[]; from: Anchor },
): void {
  const to = snapAnchor(point, bars, projection, surface.magnet)
  if (active.handle >= 0) {
    // Reshaping: only the grabbed anchor moves, and it lands exactly where the pointer says.
    const anchors = active.origin.map((anchor, index) => (index === active.handle ? to : anchor))
    surface.onReplaceAnchors(active.id, anchors)
    return
  }
  // Moving the whole drawing. The anchors are recomputed from the drag's starting set every time
  // rather than nudged, so a long drag cannot accumulate the rounding that repeated deltas would.
  const deltaIndex = to.index - active.from.index
  const deltaPrice = priceDelta(to.price, active.from.price)
  surface.onReplaceAnchors(active.id, translate(active.origin, deltaIndex, deltaPrice))
}

function priceDelta(to: string, from: string): string {
  return new Decimal(to).minus(new Decimal(from)).toString()
}
