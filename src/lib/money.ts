import Decimal from "decimal.js"

// Mirrors the backend's zero-decimal currency set. A currency whose smallest unit is the
// whole unit must never be rendered with cents that do not exist.
export const ZERO_DECIMAL_CURRENCIES = new Set(["IDR", "JPY", "KRW", "VND"])

export function displayScale(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2
}

// Strips everything but a leading minus sign, digits and a decimal point, so pasted content - a
// currency symbol from Excel ("฿65.00"), thousand separators ("$1,234.56"), stray whitespace -
// never reaches decimal.js unsanitized. Only the first "." encountered survives as the decimal
// separator. A minus only counts as a sign right at the start (e.g. a signed balance like
// "-45.50"); one appearing anywhere else is just noise and is dropped like any other symbol.
export function sanitizeMoneyInput(raw: string): string {
  const negative = /^\s*-/.test(raw)
  const digitsAndDot = raw.replace(/[^\d.]/g, "")
  const firstDot = digitsAndDot.indexOf(".")
  const cleaned = firstDot === -1 ? digitsAndDot : digitsAndDot.slice(0, firstDot + 1) + digitsAndDot.slice(firstDot + 1).replace(/\./g, "")
  return negative && cleaned ? `-${cleaned}` : cleaned
}

// Counts the digit/decimal-point characters in a string - used to keep the caret in the right
// place across a reformat that only ever inserts or removes comma characters.
export function digitCount(value: string): number {
  return (value.match(/[\d.]/g) ?? []).length
}

// The index just past the Nth digit/decimal-point character in `formatted` - the inverse of
// digitCount, used to relocate the caret after grouping/ungrouping changes the string length.
export function indexAfterDigitCount(formatted: string, count: number): number {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted[i]!)) {
      seen++
      if (seen === count) return i + 1
    }
  }
  return formatted.length
}

// Inserts thousand separators into a plain sanitized digit string (optionally signed, optionally
// with a single decimal point) without changing its value. Used both live while typing and when
// rendering an already-scaled amount.
export function groupThousands(raw: string): string {
  if (!raw) return raw
  const negative = raw.startsWith("-")
  const unsigned = negative ? raw.slice(1) : raw
  const [intPart, decPart] = unsigned.split(".")
  const grouped = (intPart ?? "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return (negative ? "-" : "") + (decPart !== undefined ? `${grouped}.${decPart}` : grouped)
}

// Parses a money string into a Decimal, defaulting to zero rather than throwing when the value is
// empty or something unsanitized slipped through - the split/payer previews recompute on every
// keystroke, so a bad value must degrade quietly instead of crashing the form.
export function safeDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0)
  try {
    return new Decimal(typeof value === "string" ? sanitizeMoneyInput(value) || "0" : value)
  } catch {
    return new Decimal(0)
  }
}

// Canonical "{currency} {amount}" formatter with thousand separators, replacing the duplicated
// money() helpers that used to live in expense-dialog/dashboard/split-editor.
export function formatMoney(amount: string | number | Decimal, currency: string): string {
  const value = amount instanceof Decimal ? amount : safeDecimal(amount)
  return `${currency} ${groupThousands(value.toFixed(displayScale(currency)))}`
}
