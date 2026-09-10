import type { FeedDifficulty } from "@/features/feed/types"

// Every user-facing string about a feed lives here, so a copy change cannot accidentally
// introduce a date, a ticker, or a hint about which instrument a feed is.
export const difficultyCopy: Record<FeedDifficulty, { label: string; blurb: string }> = {
  calm: { label: "Calm", blurb: "Compressed range, little net direction. Hard to be rewarded for impatience." },
  standard: { label: "Standard", blurb: "Ordinary conditions. The baseline for judging a process." },
  volatile: { label: "Volatile", blurb: "Elevated ranges. Stops get hit on noise as often as on being wrong." },
  crisis: { label: "Crisis", blurb: "Extreme dislocation. Gaps, exhaustion, and very little mean reversion." },
}

export const difficultyOrder: FeedDifficulty[] = ["calm", "standard", "volatile", "crisis"]

export const timeframeOptions = ["1m", "5m", "15m", "30m", "1h", "4h", "1d"] as const

// A replay's position is always expressed relative to the playhead, never as a calendar date.
// "T-140" tells the trader where they are; "March 2023" tells them how it ended.
export function tickOffsetLabel(index: number, cursor: number): string {
  const delta = cursor - index
  if (delta === 0) return "T-0 · live playhead"
  if (delta > 0) return `T-${delta}`
  return `T+${Math.abs(delta)} · future window`
}
