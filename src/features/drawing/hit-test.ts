import {
  distanceToLine,
  distanceToPolyline,
  distanceToRay,
  distanceToRect,
  distanceToSegment,
  handleRadius,
  hitToleranceUnselected,
  type Pixel,
} from "@/lib/chart-geometry"
import { anchorToPixel, type Projection } from "@/features/drawing/projection"
import { retracementLevels, extensionLevels } from "@/features/drawing/fib"
import type { Drawing } from "@/features/drawing/types"

// Hit-testing, sharing its geometry with the renderer.
//
// The rule kept here: **whatever is drawn is what answers a click**. A horizontal line drawn all
// the way across the plot but hit-tested only between its anchors is a line the trader can see and
// cannot select, and that reads as the app being broken rather than as a subtle bounds bug. So
// both sides derive their shape from `drawingShape` below.

export type Shape =
  | { form: "segment"; a: Pixel; b: Pixel }
  | { form: "ray"; a: Pixel; b: Pixel }
  | { form: "line"; a: Pixel; b: Pixel }
  | { form: "rect"; a: Pixel; b: Pixel }
  | { form: "path"; points: Pixel[] }
  | { form: "levels"; left: number; right: number; ys: number[] }
  | { form: "point"; at: Pixel }

/**
 * The pixel shape of a drawing at the current scale.
 *
 * `plotWidth` is how far a full-width line runs — horizontals and fib levels span the plot, not
 * just the gap between their anchors, which is what a trader means by "a level". `plotHeight` does
 * the same for a vertical.
 */
export function drawingShape(
  drawing: Drawing,
  projection: Projection,
  plotWidth: number,
  plotHeight: number,
): Shape | null {
  const points = drawing.anchors.map((anchor) => anchorToPixel(anchor, projection))
  const [first, second, third] = points
  switch (drawing.kind) {
    case "trendline":
      return first && second ? { form: "segment", a: first, b: second } : null
    case "ray":
      return first && second ? { form: "ray", a: first, b: second } : null
    case "extended":
      return first && second ? { form: "line", a: first, b: second } : null
    case "horizontal":
      return first ? { form: "segment", a: { x: 0, y: first.y }, b: { x: plotWidth, y: first.y } } : null
    case "vertical":
      return first ? { form: "segment", a: { x: first.x, y: 0 }, b: { x: first.x, y: plotHeight } } : null
    case "zone":
      return first && second ? { form: "rect", a: first, b: second } : null
    case "polyline":
    case "brush":
      return points.length > 0 ? { form: "path", points } : null
    case "note":
      return first ? { form: "point", at: first } : null
    case "fib": {
      if (!first || !second) return null
      const levels = retracementLevels(drawing.anchors[0]!, drawing.anchors[1]!)
      return {
        form: "levels",
        left: Math.min(first.x, second.x),
        // A retracement is read forward from the swing, so its levels run to the right edge rather
        // than stopping at the second anchor.
        right: plotWidth,
        ys: levels.map((level) => projection.toY(level.price)),
      }
    }
    case "fibExtension": {
      if (!first || !second || !third) return null
      const levels = extensionLevels(drawing.anchors[0]!, drawing.anchors[1]!, drawing.anchors[2]!)
      return {
        form: "levels",
        left: Math.min(first.x, second.x, third.x),
        right: plotWidth,
        ys: levels.map((level) => projection.toY(level.price)),
      }
    }
    default:
      return null
  }
}

function distanceToShape(shape: Shape, point: Pixel): number {
  switch (shape.form) {
    case "segment":
      return distanceToSegment(point, shape.a, shape.b)
    case "ray":
      return distanceToRay(point, shape.a, shape.b)
    case "line":
      return distanceToLine(point, shape.a, shape.b)
    case "rect":
      return distanceToRect(point, shape.a, shape.b)
    case "path":
      return distanceToPolyline(point, shape.points)
    case "point":
      return Math.hypot(point.x - shape.at.x, point.y - shape.at.y)
    case "levels": {
      if (point.x < shape.left - hitToleranceUnselected) return Number.POSITIVE_INFINITY
      let nearest = Number.POSITIVE_INFINITY
      for (const y of shape.ys) {
        const distance = Math.abs(point.y - y)
        if (distance < nearest) nearest = distance
      }
      return nearest
    }
    default:
      return Number.POSITIVE_INFINITY
  }
}

/**
 * The drawing under the pointer, or null.
 *
 * Later drawings win ties, because the trader drew them last and that is the one on top.
 */
export function hitTest(
  drawings: Drawing[],
  point: Pixel,
  projection: Projection,
  plotWidth: number,
  plotHeight: number,
  tolerance = hitToleranceUnselected,
): string | null {
  let hit: string | null = null
  let nearest = tolerance
  for (const drawing of drawings) {
    const shape = drawingShape(drawing, projection, plotWidth, plotHeight)
    if (!shape) continue
    const distance = distanceToShape(shape, point)
    if (distance <= nearest) {
      nearest = distance
      hit = drawing.id
    }
  }
  return hit
}

/**
 * Which anchor handle the pointer is on, or -1.
 *
 * Checked before the body of the drawing, so grabbing an endpoint reshapes the line rather than
 * dragging the whole thing — which is what a trader adjusting a trendline is trying to do.
 */
export function handleIndexAt(drawing: Drawing, point: Pixel, projection: Projection): number {
  let found = -1
  let nearest = handleRadius * 2.5
  drawing.anchors.forEach((anchor, index) => {
    const pixel = anchorToPixel(anchor, projection)
    const distance = Math.hypot(point.x - pixel.x, point.y - pixel.y)
    if (distance <= nearest) {
      nearest = distance
      found = index
    }
  })
  return found
}
