import { handleRadius, type Pixel } from "@/lib/chart-geometry"
import { withAlpha, type ChartPalette } from "@/features/chart/theme"
import { extensionLevels, formatRatio, retracementLevels, type FibLevel } from "@/features/drawing/fib"
import { anchorToPixel, type Projection } from "@/features/drawing/projection"
import { drawingShape } from "@/features/drawing/hit-test"
import type { Drawing } from "@/features/drawing/types"

// Drawing rendering.
//
// Shapes come from `drawingShape`, the same function hit-testing uses, so what the trader sees is
// exactly what answers a click. Two implementations of "where is this line" is how you get an
// object that is visible and unselectable.

export type DrawingFrame = {
  drawings: Drawing[]
  draft: Drawing | null
  selectedId: string | null
  projection: Projection
  palette: ChartPalette
  plotWidth: number
  plotHeight: number
}

export function drawDrawings(ctx: CanvasRenderingContext2D, frame: DrawingFrame): void {
  for (const drawing of frame.drawings) {
    paint(ctx, drawing, frame, drawing.id === frame.selectedId)
  }
  if (frame.draft) {
    // The in-progress drawing is dashed and dimmed: it is a preview of a commitment, and it should
    // not read as something already on the chart.
    ctx.save()
    ctx.globalAlpha = 0.7
    ctx.setLineDash([4, 3])
    paint(ctx, frame.draft, frame, false)
    ctx.restore()
  }
}

function paint(ctx: CanvasRenderingContext2D, drawing: Drawing, frame: DrawingFrame, selected: boolean): void {
  const { palette, projection, plotWidth, plotHeight } = frame
  const shape = drawingShape(drawing, projection, plotWidth, plotHeight)
  if (!shape) return

  ctx.strokeStyle = selected ? palette.telemetry : palette.foreground
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = selected ? 2 : 1.25

  switch (shape.form) {
    case "segment":
      strokeLine(ctx, shape.a, shape.b)
      break
    case "ray":
      strokeLine(ctx, shape.a, extend(shape.a, shape.b, plotWidth, plotHeight))
      break
    case "line":
      strokeLine(ctx, extend(shape.b, shape.a, plotWidth, plotHeight), extend(shape.a, shape.b, plotWidth, plotHeight))
      break
    case "rect": {
      // A supply zone the trader cannot see through is a zone that hides price, which is why the
      // shading is adjustable rather than fixed.
      const left = Math.min(shape.a.x, shape.b.x)
      const top = Math.min(shape.a.y, shape.b.y)
      const width = Math.abs(shape.b.x - shape.a.x)
      const height = Math.abs(shape.b.y - shape.a.y)
      ctx.fillStyle = withAlpha(palette.telemetry, drawing.opacity ?? 0.18)
      ctx.fillRect(left, top, width, height)
      ctx.strokeStyle = selected ? palette.telemetry : withAlpha(palette.telemetry, 0.65)
      ctx.strokeRect(left, top, width, height)
      break
    }
    case "path":
      strokePath(ctx, shape.points)
      break
    case "levels":
      paintLevels(ctx, drawing, frame, selected)
      break
    case "point":
      paintNote(ctx, drawing, shape.at, frame, selected)
      break
  }

  if (selected) paintHandles(ctx, drawing, frame)
}

function paintLevels(ctx: CanvasRenderingContext2D, drawing: Drawing, frame: DrawingFrame, selected: boolean): void {
  const { palette, projection, plotWidth } = frame
  const levels: FibLevel[] =
    drawing.kind === "fib"
      ? retracementLevels(drawing.anchors[0]!, drawing.anchors[1]!)
      : extensionLevels(drawing.anchors[0]!, drawing.anchors[1]!, drawing.anchors[2]!)
  const left = Math.min(...drawing.anchors.map((anchor) => projection.toX(anchor.index)))

  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace'
  ctx.textBaseline = "bottom"
  levels.forEach((level) => {
    // The pixel is named before it is nudged: the money-arithmetic rule reads the expression text
    // and cannot tell that toY() has already left price space, and keeping the rule strict is
    // worth one extra line.
    const levelPixel = projection.toY(level.price)
    const y = Math.round(levelPixel) + 0.5
    // The named levels are the ones traders act on, so they are drawn solid while the rest stay
    // dashed. Reading the chart should not require reading the labels.
    const emphasised = level.label !== undefined
    ctx.strokeStyle = emphasised ? palette.telemetry : withAlpha(palette.muted, selected ? 0.9 : 0.55)
    ctx.lineWidth = emphasised ? 1.5 : 1
    ctx.setLineDash(emphasised ? [] : [3, 3])
    ctx.beginPath()
    ctx.moveTo(left, y)
    ctx.lineTo(plotWidth, y)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = emphasised ? palette.telemetry : palette.muted
    const label = level.label ? `${formatRatio(level.ratio)} ${level.label}` : formatRatio(level.ratio)
    ctx.fillText(`${label}  ${level.price}`, left + 4, y - 2)
  })
}

function paintNote(ctx: CanvasRenderingContext2D, drawing: Drawing, at: Pixel, frame: DrawingFrame, selected: boolean): void {
  const { palette } = frame
  const text = drawing.text?.trim() || "Note"
  ctx.font = '11px ui-sans-serif, system-ui, sans-serif'
  ctx.textBaseline = "middle"
  const width = ctx.measureText(text).width + 12
  const height = 18
  ctx.fillStyle = withAlpha(palette.panel, 0.92)
  ctx.fillRect(at.x + 8, at.y - height / 2, width, height)
  ctx.strokeStyle = selected ? palette.telemetry : withAlpha(palette.telemetry, 0.6)
  ctx.lineWidth = 1
  ctx.strokeRect(at.x + 8, at.y - height / 2, width, height)
  ctx.fillStyle = palette.foreground
  ctx.fillText(text, at.x + 14, at.y)
  // A leader dot on the anchored bar, so the note points at something rather than floating.
  ctx.fillStyle = palette.telemetry
  ctx.beginPath()
  ctx.arc(at.x, at.y, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

function paintHandles(ctx: CanvasRenderingContext2D, drawing: Drawing, frame: DrawingFrame): void {
  const { palette, projection } = frame
  // A brush stroke has hundreds of anchors; drawing a handle on every one would bury the stroke.
  // The endpoints are the only ones worth grabbing anyway.
  const anchors =
    drawing.kind === "brush" && drawing.anchors.length > 2
      ? [drawing.anchors[0]!, drawing.anchors[drawing.anchors.length - 1]!]
      : drawing.anchors
  for (const anchor of anchors) {
    const point = anchorToPixel(anchor, projection)
    ctx.fillStyle = palette.panel
    ctx.strokeStyle = palette.telemetry
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(point.x, point.y, handleRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

function strokeLine(ctx: CanvasRenderingContext2D, a: Pixel, b: Pixel): void {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function strokePath(ctx: CanvasRenderingContext2D, points: Pixel[]): void {
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0]!.x, points[0]!.y)
  for (const point of points.slice(1)) ctx.lineTo(point.x, point.y)
  ctx.stroke()
}

/**
 * Projects the ray a→b out past the edge of the plot.
 *
 * Multiplying by a large constant would work until a nearly-vertical line pushed the coordinate
 * far enough for the canvas to lose precision; scaling to the plot's own diagonal keeps the
 * endpoint just off-screen at any angle.
 */
function extend(a: Pixel, b: Pixel, plotWidth: number, plotHeight: number): Pixel {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return b
  const reach = Math.hypot(plotWidth, plotHeight)
  return { x: a.x + (dx / length) * reach, y: a.y + (dy / length) * reach }
}
