import Decimal from "decimal.js"
import { describe, expect, it } from "vitest"

import { digitCount, formatMoney, groupThousands, indexAfterDigitCount, safeDecimal, sanitizeMoneyInput } from "@/lib/money"

describe("sanitizeMoneyInput", () => {
  it("strips a pasted currency symbol", () => {
    expect(sanitizeMoneyInput("฿65.00")).toBe("65.00")
  })

  it("strips thousand-separator commas", () => {
    expect(sanitizeMoneyInput("$1,234.56")).toBe("1234.56")
  })

  it("keeps only the first decimal point", () => {
    expect(sanitizeMoneyInput("1.234.56")).toBe("1.23456")
  })

  it("passes plain numbers through unchanged", () => {
    expect(sanitizeMoneyInput("1500000")).toBe("1500000")
  })

  it("preserves a leading minus sign for a signed value like a balance", () => {
    expect(sanitizeMoneyInput("-45.50")).toBe("-45.50")
  })

  it("drops a minus that isn't at the start - it's noise, not a sign", () => {
    expect(sanitizeMoneyInput("65-00")).toBe("6500")
  })
})

describe("groupThousands", () => {
  it("groups a large integer", () => {
    expect(groupThousands("1500000")).toBe("1,500,000")
  })

  it("groups the integer part while leaving the decimal part alone", () => {
    expect(groupThousands("1234567.89")).toBe("1,234,567.89")
  })

  it("leaves small numbers and empty strings untouched", () => {
    expect(groupThousands("65")).toBe("65")
    expect(groupThousands("")).toBe("")
  })

  it("preserves a leading minus sign", () => {
    expect(groupThousands("-1500000")).toBe("-1,500,000")
  })
})

describe("digitCount / indexAfterDigitCount", () => {
  it("round-trips a caret position through grouping", () => {
    // Caret after the 3rd digit of "1500000" ("150") should land right after "150" in the
    // grouped "1,500,000" - which is index 4, since a comma was inserted after the first digit.
    const formatted = groupThousands("1500000")
    expect(indexAfterDigitCount(formatted, 3)).toBe(4)
    expect(digitCount(formatted.slice(0, 4))).toBe(3)
  })
})

describe("safeDecimal", () => {
  it("returns zero instead of throwing on garbage input", () => {
    expect(safeDecimal("not a number").toString()).toBe("0")
  })

  it("parses a sanitizable value", () => {
    expect(safeDecimal("฿65.00").toString()).toBe("65")
  })

  it("returns zero for empty/nullish input", () => {
    expect(safeDecimal("").toString()).toBe("0")
    expect(safeDecimal(undefined).toString()).toBe("0")
    expect(safeDecimal(null).toString()).toBe("0")
  })

  it("keeps the sign of a negative value like a ledger balance", () => {
    expect(safeDecimal("-45.50").toString()).toBe("-45.5")
  })
})

describe("formatMoney", () => {
  it("groups and scales a two-decimal currency", () => {
    expect(formatMoney("1500000", "THB")).toBe("THB 1,500,000.00")
  })

  it("groups a zero-decimal currency without decimals", () => {
    expect(formatMoney("1500000", "IDR")).toBe("IDR 1,500,000")
  })

  it("accepts a Decimal directly", () => {
    expect(formatMoney(new Decimal("428571.428571"), "THB")).toBe("THB 428,571.43")
  })
})
