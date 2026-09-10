import Decimal from "decimal.js"
import { describe, expect, it } from "vitest"

import { extensionLevels, formatRatio, retracementLevels, retracementRatios } from "@/features/drawing/fib"
import type { Anchor } from "@/features/drawing/types"

const swingLow: Anchor = { index: 100, price: "165.00000" }
const swingHigh: Anchor = { index: 140, price: "185.00000" }

describe("retracementLevels", () => {
  // PRD §3.2 names these exactly. A charting package that quietly ships .707 or drops .786 is not
  // showing the trader the levels they are trading.
  it("carries the PRD's levels, in order, with the two named ones named", () => {
    expect(retracementRatios.map((level) => level.ratio)).toEqual(["0", "0.236", "0.382", "0.5", "0.618", "0.786", "1"])
    expect(retracementRatios.find((level) => level.ratio === "0.5")?.label).toBe("Equilibrium")
    expect(retracementRatios.find((level) => level.ratio === "0.618")?.label).toBe("Golden Pocket")
  })

  // The convention every charting package uses: drag from the swing you are measuring *from* to
  // the one you are measuring *to*, and 0 lands where the move ended.
  it("puts 0 on the second anchor and 1 on the first", () => {
    const levels = retracementLevels(swingLow, swingHigh)
    expect(levels[0]).toMatchObject({ ratio: "0", price: "185" })
    expect(levels[levels.length - 1]).toMatchObject({ ratio: "1", price: "165" })
  })

  it("places the golden pocket where the arithmetic says", () => {
    // 185 + (165 - 185) × 0.618 = 172.64
    const golden = retracementLevels(swingLow, swingHigh).find((level) => level.ratio === "0.618")
    expect(golden?.price).toBe("172.64")
  })

  it("works the same measuring a move down as a move up", () => {
    const levels = retracementLevels(swingHigh, swingLow)
    expect(levels[0]?.price).toBe("165")
    expect(levels.find((level) => level.ratio === "0.5")?.price).toBe("175")
  })

  // The whole reason these are decimal strings. 0.1 + 0.2 in a float is not 0.3, and a level a
  // trader places a stop against must be the number they can read back.
  it("computes in decimal rather than float", () => {
    const levels = retracementLevels({ index: 0, price: "0.3" }, { index: 1, price: "0.1" })
    expect(levels.find((level) => level.ratio === "1")?.price).toBe("0.3")
    for (const level of levels) {
      expect(level.price).not.toMatch(/000000[0-9]|999999[0-9]/)
    }
  })

  // A zero-height swing is a mis-click, not a crash.
  it("collapses to one price when both anchors share a level", () => {
    const levels = retracementLevels({ index: 1, price: "170" }, { index: 9, price: "170" })
    expect(new Set(levels.map((level) => level.price))).toEqual(new Set(["170"]))
  })
})

describe("extensionLevels", () => {
  // Three anchors, and the levels project the impulse forward from the pullback — that is what
  // makes them targets rather than a second retracement.
  it("projects the impulse height from the retracement", () => {
    const levels = extensionLevels(
      { index: 100, price: "100" },
      { index: 120, price: "120" },
      { index: 130, price: "110" },
    )
    expect(levels.find((level) => level.ratio === "0")?.price).toBe("110")
    expect(levels.find((level) => level.ratio === "1")?.price).toBe("130")
    expect(levels.find((level) => level.ratio === "1.618")?.price).toBe("142.36")
  })

  it("projects downward for a down impulse", () => {
    const levels = extensionLevels(
      { index: 100, price: "120" },
      { index: 120, price: "100" },
      { index: 130, price: "110" },
    )
    expect(levels.find((level) => level.ratio === "1")?.price).toBe("90")
  })
})

// The affine blinding map is `displayed = (real + offset) × scale`. It preserves ratios along a
// segment exactly, which is the property that makes a fib drawn on a blinded feed land in the same
// structural place it would on the real one — and therefore makes replaying blinded prices a
// legitimate exercise rather than a different game.
describe("blinding invariance", () => {
  it("puts every level at the same fraction of the swing under the blinding map", () => {
    const offset = new Decimal("0.4137")
    const scale = new Decimal("3.72")
    const blind = (price: string) => new Decimal(price).plus(offset).times(scale).toString()

    const real = retracementLevels(swingLow, swingHigh)
    const blinded = retracementLevels(
      { ...swingLow, price: blind(swingLow.price) },
      { ...swingHigh, price: blind(swingHigh.price) },
    )

    real.forEach((level, position) => {
      expect(blinded[position]!.price).toBe(blind(level.price))
    })
  })
})

describe("formatRatio", () => {
  it.each([
    ["0", "0%"],
    ["0.618", "61.8%"],
    ["1", "100%"],
    ["2.618", "261.8%"],
  ])("renders %s as %s", (ratio, expected) => {
    expect(formatRatio(ratio)).toBe(expected)
  })
})
