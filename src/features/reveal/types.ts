// The unblinding.
//
// This is the one module in the frontend allowed to hold a ticker and a date, and it is a separate
// type from everything on the blinded path for the same reason the server keeps two response types:
// a field that appears conditionally is one refactor away from appearing unconditionally, and the
// person who finds that mistake is a trader who has just been handed the answer to a session they
// were still trading.

export type Reveal = {
  sessionId: string
  revealedAt: string
  /** The real ticker. Present here and nowhere else. */
  symbol: string
  timeframe: string
  windowStart: string
  windowEnd: string
  macroLabel: string | null
  macroNotes: string | null
  macroTags: string[]
  /** What the strategy is being compared against, stated rather than assumed. */
  benchmarkLabel: string
  /** Decimal strings, like every other number the trader's money passes through. */
  strategyReturnPct: string
  benchmarkReturnPct: string
  alphaPct: string
  disciplineIndex: number
}

/** A real candle from a revealed session: real prices, real time. */
export type DisclosedBar = {
  index: number
  timestamp: string
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export type Disclosure = {
  reveal: Reveal
  bars: DisclosedBar[]
}

export const benchmarkLabels: Record<string, string> = {
  buy_and_hold: "Buy & hold, unlevered, same window",
}
