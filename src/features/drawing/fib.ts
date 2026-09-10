import Decimal from "decimal.js"

import type { Anchor } from "@/features/drawing/types"

// Fibonacci levels, computed in decimal.
//
// This is the one drawing that produces *numbers the trader reads and acts on* rather than pixels:
// a golden-pocket entry and the stop beneath it are priced off these levels. So they are computed
// with decimal.js like every other price in the app, and the level's price is carried as a string.
//
// The affine blinding map (BR-01) is `displayed = (real + offset) × scale`, which preserves ratios
// along a segment exactly. A retracement drawn on blinded prices therefore sits at the same
// structural place it would on the real ones — that is the property that makes replaying a blinded
// feed a legitimate exercise rather than a different game.

export type FibLevel = {
  ratio: string
  price: string
  /** The name traders actually use, where one exists. */
  label?: string
}

// PRD §3.2, exactly. The two named levels are named because traders talk about them by name, and a
// chart that shows .618 without saying "golden pocket" is a chart they have to translate.
export const retracementRatios: { ratio: string; label?: string }[] = [
  { ratio: "0" },
  { ratio: "0.236" },
  { ratio: "0.382" },
  { ratio: "0.5", label: "Equilibrium" },
  { ratio: "0.618", label: "Golden Pocket" },
  { ratio: "0.786" },
  { ratio: "1" },
]

// Trend-based extension targets beyond the impulse. The PRD names the retracement levels exactly
// and asks for "trend-based extensions" without listing them, so these are the conventional set;
// they are here in one place to be argued with rather than scattered through the renderer.
export const extensionRatios: { ratio: string; label?: string }[] = [
  { ratio: "0" },
  { ratio: "0.618" },
  { ratio: "1" },
  { ratio: "1.272" },
  { ratio: "1.618", label: "Golden Extension" },
  { ratio: "2.618" },
]

/**
 * Retracement levels between two swing anchors.
 *
 * Ratio 0 sits on the **second** anchor and ratio 1 on the first, which is the convention every
 * charting package uses: you drag from the swing you are measuring *from* to the swing you are
 * measuring *to*, and 0 lands where the move ended.
 */
export function retracementLevels(from: Anchor, to: Anchor): FibLevel[] {
  const start = new Decimal(from.price)
  const end = new Decimal(to.price)
  const span = start.minus(end)
  return retracementRatios.map(({ ratio, label }) => ({
    ratio,
    label,
    price: end.plus(span.times(new Decimal(ratio))).toString(),
  }))
}

/**
 * Trend-based extension levels from an impulse and its retracement.
 *
 * Three anchors: where the impulse began, where it ended, and how far it pulled back. The levels
 * project the impulse's height forward from the pullback, which is what makes them targets rather
 * than a second retracement.
 */
export function extensionLevels(impulseStart: Anchor, impulseEnd: Anchor, retrace: Anchor): FibLevel[] {
  const start = new Decimal(impulseStart.price)
  const end = new Decimal(impulseEnd.price)
  const base = new Decimal(retrace.price)
  const impulse = end.minus(start)
  return extensionRatios.map(({ ratio, label }) => ({
    ratio,
    label,
    price: base.plus(impulse.times(new Decimal(ratio))).toString(),
  }))
}

/** Formats a ratio for the chart label: "61.8%" reads faster than "0.618" at a glance. */
export function formatRatio(ratio: string): string {
  return `${new Decimal(ratio).times(100).toDecimalPlaces(1).toString()}%`
}
