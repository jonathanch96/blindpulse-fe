// The replay session contract.
//
// One index, and it only moves forward. `cursorIndex` is both where the trader is and the furthest
// bar the server has released, because those cannot differ: there is no going back. Once a bar is
// stepped past it is history, the way it is on a live chart, and a trader who wants a different
// setup randomizes a new feed rather than rewinding this one.
//
// The client must never assume it may read past `cursorIndex` — and if it tries, the server refuses
// rather than clamping, so a bug here surfaces as an error instead of as silently-correct-looking
// data.

export type SessionStatus = "open" | "paused" | "closed" | "abandoned"

export type ReplaySession = {
  id: string
  accountId: string
  feedId: string
  status: SessionStatus
  timeframe: string
  speed: string
  cursorIndex: number
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
