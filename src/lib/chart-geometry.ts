// Screen-space geometry for the drawing tools.
//
// Companion to `chart-math.ts`, and here for the same reason: `src/features/**` bans `Number()`
// and `parseFloat` because a price that has been through a float is not the price the server
// quoted. Hit-testing is not price work — it asks "did the pointer land within six pixels of this
// line?", and the answer is a boolean about a screen, not a number about a market.
//
// The boundary is exact: everything in this file takes and returns **pixel coordinates**. Nothing
// here may produce a value that is stored on a drawing, sent to the server, or shown to the
// trader. Anchors are decimal strings; converting a hit back into an anchor is the caller's job,
// and magnet snapping does it by copying an OHLC string off the bar rather than by rounding a
// float.

export type Pixel = { x: number; y: number }

/** How near the pointer has to be to select something. Sized for a fingertip, not a mouse. */
export const hitToleranceUnselected = 6
export const handleRadius = 4

/** Distance from a point to a finite segment, in pixels. */
export function distanceToSegment(point: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  // Projection of the point onto the segment, clamped so it cannot run off either end — an
  // unclamped projection makes a short trendline selectable from across the chart.
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/**
 * Distance to an infinite line through a and b.
 *
 * Used by the extended-line tool, whose whole point is that it does not stop at its anchors.
 */
export function distanceToLine(point: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.abs(dy * (point.x - a.x) - dx * (point.y - a.y)) / Math.hypot(dx, dy)
}

/**
 * Distance to a ray that starts at `a` and passes through `b`, extending forward only.
 *
 * Behind the origin the nearest point is the origin itself, so a ray drawn to the right is not
 * selectable from the left of where it starts.
 */
export function distanceToRay(point: Pixel, a: Pixel, b: Pixel): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y)
  const t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared
  if (t <= 0) return Math.hypot(point.x - a.x, point.y - a.y)
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy))
}

/** Distance to a rectangle: zero inside it, otherwise the gap to the nearest edge. */
export function distanceToRect(point: Pixel, a: Pixel, b: Pixel): number {
  const left = Math.min(a.x, b.x)
  const right = Math.max(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const bottom = Math.max(a.y, b.y)
  const dx = Math.max(left - point.x, 0, point.x - right)
  const dy = Math.max(top - point.y, 0, point.y - bottom)
  return Math.hypot(dx, dy)
}

/** Distance to the nearest segment of a polyline. */
export function distanceToPolyline(point: Pixel, points: Pixel[]): number {
  if (points.length === 0) return Number.POSITIVE_INFINITY
  if (points.length === 1) return Math.hypot(point.x - points[0]!.x, point.y - points[0]!.y)
  let nearest = Number.POSITIVE_INFINITY
  for (let i = 1; i < points.length; i += 1) {
    const distance = distanceToSegment(point, points[i - 1]!, points[i]!)
    if (distance < nearest) nearest = distance
  }
  return nearest
}

/**
 * Thins a freehand stroke, keeping only points that deviate from the line between their
 * neighbours by more than `epsilon` pixels (Ramer–Douglas–Peucker).
 *
 * A brush stroke arrives as one point per pointer event — hundreds for a short flick — and every
 * one of them would be an anchor to store, hit-test and redraw. Thinning is what keeps a brush
 * from costing more than the rest of the chart put together.
 */
export function simplifyStroke(points: Pixel[], epsilon = 1.5): Pixel[] {
  if (points.length <= 2) return points
  const first = points[0]!
  const last = points[points.length - 1]!
  let worst = 0
  let worstIndex = 0
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToLine(points[i]!, first, last)
    if (distance > worst) {
      worst = distance
      worstIndex = i
    }
  }
  if (worst <= epsilon) return [first, last]
  const left = simplifyStroke(points.slice(0, worstIndex + 1), epsilon)
  const right = simplifyStroke(points.slice(worstIndex), epsilon)
  // The split point belongs to both halves; drop the duplicate.
  return [...left.slice(0, -1), ...right]
}
