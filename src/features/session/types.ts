// The replay session contract.
//
// Two indices, and the difference between them matters:
//   - cursorIndex is where the trader is looking.
//   - revealedIndex is the furthest bar the server has released.
//
// Rewinding moves the first and never the second. The client must never assume it may read past
// revealedIndex — and if it tries, the server refuses rather than clamping, so a bug here surfaces
// as an error instead of as silently-correct-looking data.

export type SessionStatus = "open" | "paused" | "closed" | "abandoned"

export type ReplaySession = {
  id: string
  accountId: string
  feedId: string
  status: SessionStatus
  timeframe: string
  speed: string
  cursorIndex: number
  revealedIndex: number
  barsScanned: number
  totalBars: number
  startedAt: string
  closedAt: string | null
}

export type SessionBar = {
  index: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  /** True while this higher-timeframe bar is still forming. Never draw it as a closed candle. */
  forming: boolean
}

export type SessionBars = {
  feedId: string
  timeframe: string
  from: number
  to: number
  bars: SessionBar[]
}

export const playbackSpeeds = ["0.5", "1", "3", "5", "10"] as const
