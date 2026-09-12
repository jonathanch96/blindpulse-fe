/**
 * The order ticket's preview maths.
 *
 * This is a *preview* and nothing more. The server sizes the position, applies the gate and decides
 * whether the order stands; what follows exists so the trader can see what they are about to risk
 * before they commit, not so the client can pre-approve itself. BR-04 is explicit that the gate lives
 * server-side — a gate in the browser is advice a hand-rolled request walks straight past — so every
 * function here is allowed to be approximate in ways the server is not, and none of them may ever
 * become the thing that decides.
 *
 * Where it must agree with the server is the shape of the arithmetic, because a preview that said
 * "risking $98" before an order the server sized at $140 would be worse than no preview at all.
 *
 * Numbers, not decimals, deliberately. These values are rendered and discarded — a float's last
 * digit cannot reach an account here, because the strings the trader typed are what get sent. The
 * one rule is that a previewed figure is never sent back as an input.
 */

export type SizingPreview = {
  /** Entry to stop, in price terms. The denominator of everything else. */
  stopDistance: number
  /** What the position would lose at its stop, in account currency. */
  riskAmount: number
  /** That risk as a percentage of equity — the number the per-trade limit is expressed in. */
  riskPct: number
  /** Reward over risk. Undefined without a target, because there is nothing to divide. */
  riskReward?: number
  /** The size implied by a risk percentage, when the trader sized that way. */
  quantity?: number
}

type Inputs = {
  side: "buy" | "sell"
  entry: number
  stopLoss: number
  takeProfit?: number
  equity: number
  /** Exactly one of these, matching the server: a size, or the fraction of the account to risk. */
  quantity?: number
  riskPct?: number
}

/**
 * Derives what an order would risk.
 *
 * Returns null rather than a zeroed preview when the inputs cannot describe a trade — an entry equal
 * to the stop, a non-positive price, a stop on the wrong side. A zeroed preview reads as "this risks
 * nothing", which is the single most dangerous thing this panel could say.
 */
export function previewSizing(inputs: Inputs): SizingPreview | null {
  const { side, entry, stopLoss, takeProfit, equity } = inputs
  if (!Number.isFinite(entry) || !Number.isFinite(stopLoss) || entry <= 0 || stopLoss <= 0) return null
  // The stop must sit on the losing side of the entry. The server's gate says the same thing; here it
  // is the difference between a preview and a nonsense number, because a stop on the winning side
  // produces a positive "risk" that is really a guaranteed profit.
  if (side === "buy" ? stopLoss >= entry : stopLoss <= entry) return null

  const stopDistance = Math.abs(entry - stopLoss)
  if (stopDistance <= 0) return null

  // Sizing from risk: dollars at stake divided by the distance to the stop. This is the calculation
  // the blinding map cancels out of — the scale is in the denominator here and in the numerator of
  // the realized PnL — which is why a blinded replay produces the dollar outcomes of the real series.
  let quantity = inputs.quantity
  if (quantity === undefined && inputs.riskPct !== undefined) {
    if (!Number.isFinite(inputs.riskPct) || inputs.riskPct <= 0 || equity <= 0) return null
    quantity = (equity * (inputs.riskPct / 100)) / stopDistance
  }
  if (quantity === undefined || !Number.isFinite(quantity) || quantity <= 0) return null

  const riskAmount = stopDistance * quantity
  const riskPct = equity > 0 ? (riskAmount / equity) * 100 : 0

  let riskReward: number | undefined
  if (takeProfit !== undefined && Number.isFinite(takeProfit) && takeProfit > 0) {
    // Only a target on the winning side has a reward to speak of. One on the losing side is an input
    // error, and reporting its distance as a reward would invent a ratio out of a mistake.
    const onTheRightSide = side === "buy" ? takeProfit > entry : takeProfit < entry
    if (onTheRightSide) riskReward = Math.abs(takeProfit - entry) / stopDistance
  }

  return {
    stopDistance,
    riskAmount,
    riskPct,
    riskReward,
    quantity: inputs.quantity === undefined ? quantity : undefined,
  }
}

/**
 * How far a position travelled against itself, as a fraction of its own stop.
 *
 * The reading MAE exists for: 0.6 means the trade spent time 60% of the way to being stopped out and
 * then worked, which is a different lesson from 0.05. Over 1 means it traded *through* the stop level
 * — possible on a gap, where the fill is worse than the stop — and is worth seeing as such rather
 * than clamped to look tidy.
 */
export function heatAgainstStop(excursion: string | undefined, entry: string, initialStop: string): number | null {
  const distance = Math.abs(Number(entry) - Number(initialStop))
  const travelled = Number(excursion)
  if (excursion === undefined || !Number.isFinite(travelled) || !Number.isFinite(distance) || distance <= 0) {
    return null
  }
  return travelled / distance
}
