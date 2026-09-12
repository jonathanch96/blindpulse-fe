import { describe, expect, it } from "vitest"

import { heatAgainstStop, previewSizing } from "@/features/execution/sizing"

const base = { side: "buy" as const, entry: 179.7, stopLoss: 179.3, equity: 10_000 }

describe("previewSizing", () => {
  // The calculation the whole product rests on: dollars at stake over the distance to the stop. A
  // trader risking 1% of 10,000 over a 0.4 stop gets 250 units, and the server independently agreed
  // on exactly that figure when this was driven end to end.
  it("derives the size from the dollar risk and the stop distance", () => {
    const preview = previewSizing({ ...base, riskPct: 1 })
    expect(preview).not.toBeNull()
    expect(preview!.quantity).toBeCloseTo(250, 6)
    expect(preview!.riskAmount).toBeCloseTo(100, 6)
    expect(preview!.riskPct).toBeCloseTo(1, 6)
  })

  // This is the blinding-invariance property, which is what makes a blinded simulator meaningful
  // rather than a game with arbitrary units. The blinding map is affine, so doubling the scale
  // doubles both the prices and the stop distance; size comes out halved and the dollar risk is
  // unchanged. If this ever fails, the numbers stay plausible and stop meaning anything.
  it("risks the same dollars whatever scale the feed was blinded with", () => {
    const plain = previewSizing({ ...base, riskPct: 1 })!
    const scaled = previewSizing({ side: "buy", entry: 359.4, stopLoss: 358.6, equity: 10_000, riskPct: 1 })!
    expect(scaled.riskAmount).toBeCloseTo(plain.riskAmount, 6)
    expect(scaled.quantity).toBeCloseTo(plain.quantity! / 2, 6)
  })

  it("reports the risk of an explicitly sized order without inventing a quantity", () => {
    const preview = previewSizing({ ...base, quantity: 500 })!
    expect(preview.riskAmount).toBeCloseTo(200, 6)
    expect(preview.riskPct).toBeCloseTo(2, 6)
    // Nothing to derive: the trader named the size, so echoing one back would imply the server
    // computed it.
    expect(preview.quantity).toBeUndefined()
  })

  it("computes reward over risk only for a target on the winning side", () => {
    expect(previewSizing({ ...base, riskPct: 1, takeProfit: 180.6 })!.riskReward).toBeCloseTo(2.25, 6)
    // A target below a long's entry is an input error, not a 2:1 short. Reporting its distance as a
    // reward would invent a ratio out of a mistake.
    expect(previewSizing({ ...base, riskPct: 1, takeProfit: 179.0 })!.riskReward).toBeUndefined()
  })

  // Returning a zeroed preview here would read as "this risks nothing", which is the most dangerous
  // sentence this panel could say. Null means "cannot describe a trade" and the ticket stays quiet.
  it("refuses to describe inputs that are not a trade", () => {
    expect(previewSizing({ ...base, riskPct: 1, stopLoss: 179.7 })).toBeNull()
    expect(previewSizing({ ...base, riskPct: 1, stopLoss: 180.1 })).toBeNull()
    expect(previewSizing({ ...base, riskPct: 0 })).toBeNull()
    expect(previewSizing({ ...base, quantity: -5 })).toBeNull()
    expect(previewSizing({ ...base, riskPct: 1, entry: Number.NaN })).toBeNull()
  })

  it("mirrors the sides for a short", () => {
    const short = previewSizing({ side: "sell", entry: 179.3, stopLoss: 179.7, equity: 10_000, riskPct: 1, takeProfit: 178.5 })!
    expect(short.quantity).toBeCloseTo(250, 6)
    expect(short.riskReward).toBeCloseTo(2, 6)
    // A stop *below* a short's entry is the wrong side, exactly as above the entry is for a long.
    expect(previewSizing({ side: "sell", entry: 179.3, stopLoss: 179.0, equity: 10_000, riskPct: 1 })).toBeNull()
  })
})

describe("heatAgainstStop", () => {
  // The reading MAE exists for. 0.64 means the trade spent time most of the way to being stopped and
  // then worked — a different lesson from 0.05, and the reason excursions are price distances rather
  // than money.
  it("reports an excursion as a fraction of the position's own stop", () => {
    expect(heatAgainstStop("0.25775", "179.70002", "179.3")).toBeCloseTo(0.6443, 3)
  })

  // Over 1 is real: a gap can fill worse than the stop level. Clamping it to look tidy would hide
  // the one case the trader most needs to see.
  it("reports travel through the stop as more than one", () => {
    expect(heatAgainstStop("0.5", "179.7", "179.3")).toBeCloseTo(1.25, 6)
  })

  it("says nothing when there is nothing measured", () => {
    expect(heatAgainstStop(undefined, "179.7", "179.3")).toBeNull()
    expect(heatAgainstStop("0.1", "179.7", "179.7")).toBeNull()
  })
})
