// The blinded feed contract.
//
// These types mirror the backend's `entities/response/feed` exactly, and like it they are
// deliberately narrow: there is no `symbol`, no `instrumentId`, no `windowStart`. That is not an
// omission to be filled in later — a trader learns what they were trading at the reveal, and a
// type with no field for the ticker cannot render the ticker by accident.
//
// If you are about to add an identifying field here because "the API might send it", the API does
// not, and the guard in src/test/architecture.test.ts will fail the build.

export type FeedDifficulty = "calm" | "standard" | "volatile" | "crisis"

export type Feed = {
  id: string
  /** Synthetic identifier, e.g. "Asset #842". Minted server-side from a sequence. */
  alias: string
  /** A coarse bucket such as "FX/CRYPTO MASKED" — never the real asset class. */
  assetClassHint: string
  /** Bar interval. Not identifying: thousands of instruments trade a 15-minute chart. */
  timeframe: string
  difficulty: FeedDifficulty
  /** Counts, not dates. "500 bars" says how long a session is without saying when it was. */
  totalBars: number
  warmupBars: number
  tradeableBars: number
}

export type FeedDetail = Feed & {
  /** Qualitative band rather than the realized number, which is very nearly a fingerprint. */
  volatilityBand: "compressed" | "normal" | "elevated" | "extreme" | "unknown"
  structureBand: "ranging" | "mixed" | "trending" | "unknown"
}

/** A blinded candle. Note the index where a timestamp would be. */
export type FeedBar = {
  index: number
  open: string
  high: string
  low: string
  close: string
  volume: string
}

export type FeedBars = {
  feedId: string
  from: number
  to: number
  bars: FeedBar[]
}

export type FeedFilter = {
  difficulty?: FeedDifficulty
  timeframe?: string
}
