// Decimal values arrive from the API as strings and are formatted here without ever becoming a
// JS number in the general case. Intl.NumberFormat needs a number, so these helpers are the one
// place that conversion happens — for display only, never for a value that is stored or sent back.

export function formatMoney(value: string, currency = "USD"): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount)
}

// Signed on purpose: a return is meaningless without its direction, and "+24.50%" reads as a
// result where "24.50%" reads as a quantity.
export function formatSignedPercent(value: string, fractionDigits = 2): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return `${amount >= 0 ? "+" : ""}${amount.toFixed(fractionDigits)}%`
}

export function formatPercent(value: string, fractionDigits = 2): string {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return value
  return `${amount.toFixed(fractionDigits)}%`
}

export function isPositive(value: string): boolean {
  return Number(value) > 0
}

export function isNegative(value: string): boolean {
  return Number(value) < 0
}

// Truncates a hash the way the accounts screen shows it: enough of both ends to compare two by
// eye, without a 64-character string wrapping a dense panel.
export function shortHash(hash: string, lead = 6, tail = 4): string {
  if (hash.length <= lead + tail + 1) return hash
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`
}

export function formatIterationLabel(index: number): string {
  return `#${String(index).padStart(2, "0")}`
}
