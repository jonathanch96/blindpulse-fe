import type { Scale } from "@/lib/chart-math"
import { toPlotValue } from "@/lib/chart-math"
import type { Pixel } from "@/lib/chart-geometry"
import type { Anchor } from "@/features/drawing/types"
import type { ChartBar } from "@/features/chart/types"

// The bridge between an anchor (bar index + decimal price) and a pixel.
//
// It runs in both directions, and the two directions are deliberately asymmetric. Anchor → pixel
// is display geometry and may use floats freely. Pixel → anchor is where a float would otherwise
// become a stored price, so it goes through `snapAnchor`, which prefers to copy an exact OHLC
// string off the nearest bar rather than keep the number it computed.

export type Projection = {
  /** Left edge of the plot area to the centre of the bar at this index. */
  toX: (index: number) => number
  toY: (price: string) => number
  /** The bar index under an x coordinate. May fall outside the window; callers clamp. */
  toIndex: (x: number) => number
  /** The price under a y coordinate, as a display number. Never store this — snap it first. */
  priceAt: (y: number) => number
}

export function buildProjection(scale: Scale, slot: number, firstIndex: number): Projection {
  const safeSlot = slot > 0 ? slot : 1
  return {
    toX: (index) => (index - firstIndex) * safeSlot + safeSlot / 2,
    toY: (price) => scale.toY(toPlotValue(price)),
    toIndex: (x) => Math.round((x - safeSlot / 2) / safeSlot) + firstIndex,
    priceAt: (y) => scale.toPrice(y),
  }
}

export function anchorToPixel(anchor: Anchor, projection: Projection): Pixel {
  return { x: projection.toX(anchor.index), y: projection.toY(anchor.price) }
}

/**
 * Turns a pointer position into an anchor, snapping to the nearest OHLC price when `magnet` is on.
 *
 * Magnet snapping is not a convenience here, it is the precision story. A trendline anchored at
 * "the pixel my mouse happened to be over" carries a price with fourteen meaningless decimals; one
 * anchored to a bar's actual high carries the exact string the server sent. So when magnet is on,
 * the returned price is *copied* from the bar rather than computed, and no float reaches the
 * drawing at all.
 *
 * With magnet off the price is formatted from the pointer, and that is a deliberate, visible
 * trade: a freehand anchor is approximate by definition and the trader chose it.
 */
/** How near an OHLC level has to be, in pixels, before the magnet takes it. */
export const magnetRadius = 14

export function snapAnchor(
  point: Pixel,
  bars: ChartBar[],
  projection: Projection,
  magnet: boolean,
  priceScale = 5,
): Anchor {
  const index = clampIndex(projection.toIndex(point.x), bars)
  const bar = bars.find((candidate) => candidate.index === index) ?? bars[bars.length - 1]
  if (!bar) {
    return { index, price: projection.priceAt(point.y).toFixed(priceScale) }
  }
  if (!magnet) {
    return { index: bar.index, price: projection.priceAt(point.y).toFixed(priceScale) }
  }
  // Nearest of the four, measured in pixels rather than in price: on a log scale the same price
  // gap is a different distance at different levels, and the trader is aiming with their eyes.
  let best = bar.open
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of [bar.open, bar.high, bar.low, bar.close]) {
    const distance = Math.abs(projection.toY(candidate) - point.y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  // A *weak* magnet, deliberately. A strong one always snaps, which on a quiet feed drags an
  // anchor the length of the pane to reach a bar that never traded near where the trader clicked —
  // the line then lands somewhere they did not point at, and the tool reads as broken. Beyond the
  // threshold the pointer wins and the anchor is approximate, which is at least what they asked for.
  if (bestDistance > magnetRadius) {
    return { index: bar.index, price: projection.priceAt(point.y).toFixed(priceScale) }
  }
  return { index: bar.index, price: best }
}

function clampIndex(index: number, bars: ChartBar[]): number {
  if (bars.length === 0) return index
  const first = bars[0]!.index
  const last = bars[bars.length - 1]!.index
  return Math.min(Math.max(index, first), last)
}
