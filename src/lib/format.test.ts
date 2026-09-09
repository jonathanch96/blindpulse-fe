import { describe, expect, it } from "vitest"

import { formatMoney, formatSignedPercent, isNegative, isPositive, shortHash } from "@/lib/format"

describe("format", () => {
  it("formats decimal strings as money without losing the value when it is not a number", () => {
    expect(formatMoney("12450.00")).toBe("$12,450.00")
    expect(formatMoney("not-a-number")).toBe("not-a-number")
  })

  // A return without a sign reads as a quantity rather than a result, so the plus is not cosmetic.
  it("always signs a percentage", () => {
    expect(formatSignedPercent("24.5")).toBe("+24.50%")
    expect(formatSignedPercent("-8")).toBe("-8.00%")
    expect(formatSignedPercent("0")).toBe("+0.00%")
  })

  it("classifies direction from the string without rounding it first", () => {
    expect(isPositive("0.0001")).toBe(true)
    expect(isNegative("-0.0001")).toBe(true)
    expect(isPositive("0")).toBe(false)
    expect(isNegative("0")).toBe(false)
  })

  it("keeps both ends of a hash so two can be compared by eye", () => {
    expect(shortHash("0x8f7c1d2e3f4a5b6c7d8e9fa19c")).toBe("0x8f7c…a19c")
    expect(shortHash("short")).toBe("short")
  })
})
