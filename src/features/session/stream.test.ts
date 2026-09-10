import { describe, expect, it } from "vitest"

import { applyFrame, decodeFrame, hasGap, mergeBar, nextBackoffMs } from "@/features/session/stream"
import type { ReplaySession, SessionBar } from "@/features/session/types"

function bar(index: number, close = "100", forming = false): SessionBar {
  return { index, open: "99", high: "101", low: "98", close, volume: "10", forming }
}

const wireFrame = {
  kind: "bar",
  status: "open",
  timeframe: "15m",
  speed: "3",
  cursor_index: 214,
  revealed_index: 214,
  bars_scanned: 215,
  total_bars: 701,
  latency_ms: 7,
  bar: { index: 214, open: "168.1", high: "168.9", low: "167.8", close: "168.45", volume: "12", forming: false },
}

describe("decodeFrame", () => {
  // Frames come straight from the Go API rather than through the BFF, so nothing has camelized
  // them on the way. This is the only place in the app that knows the wire is snake_case.
  it("camelizes the wire frame the socket delivers", () => {
    expect(decodeFrame(JSON.stringify(wireFrame))).toEqual({
      kind: "bar",
      status: "open",
      timeframe: "15m",
      speed: "3",
      cursorIndex: 214,
      revealedIndex: 214,
      barsScanned: 215,
      totalBars: 701,
      latencyMs: 7,
      bar: { index: 214, open: "168.1", high: "168.9", low: "167.8", close: "168.45", volume: "12", forming: false },
    })
  })

  it("keeps the forming flag, which decides whether the bar is drawn as a closed candle", () => {
    const forming = { ...wireFrame, bar: { ...wireFrame.bar, forming: true } }
    expect(decodeFrame(JSON.stringify(forming))?.bar?.forming).toBe(true)
  })

  // A malformed message must be discarded, not allowed to reach the chart as NaNs. This payload
  // does not pass through the envelope handling every other response does.
  it.each([
    ["not json at all", "}{"],
    ["a json scalar", '"hello"'],
    ["an unknown kind", JSON.stringify({ ...wireFrame, kind: "sudo" })],
    ["a missing kind", JSON.stringify({ ...wireFrame, kind: undefined })],
  ])("discards %s", (_label, raw) => {
    expect(decodeFrame(raw)).toBeNull()
  })

  it("drops a bar with no index rather than inventing one", () => {
    const raw = JSON.stringify({ ...wireFrame, bar: { open: "1", close: "2" } })
    expect(decodeFrame(raw)?.bar).toBeUndefined()
  })

  it("defaults absent numbers to zero instead of NaN", () => {
    const raw = JSON.stringify({ kind: "heartbeat" })
    expect(decodeFrame(raw)).toMatchObject({ kind: "heartbeat", latencyMs: 0, revealedIndex: 0 })
  })
})

describe("mergeBar", () => {
  // The forming bucket on a higher timeframe repeats its index across frames until it closes, so
  // one rule — replace on repeat, append on advance — animates the forming bar and lands the
  // closed one with no aggregation logic in the client.
  it("replaces the last bar when the index repeats", () => {
    const bars = [bar(5), bar(6, "100", true)]
    expect(mergeBar(bars, bar(6, "105", true))).toEqual([bar(5), bar(6, "105", true)])
  })

  it("appends when the index advances", () => {
    expect(mergeBar([bar(5)], bar(6))).toEqual([bar(5), bar(6)])
  })

  it("appends into an empty series", () => {
    expect(mergeBar([], bar(0))).toEqual([bar(0)])
  })

  // A frame that arrives after a rewind or a refetch is stale. The authoritative window is what
  // the last fetch returned, so an older index must not rewrite it.
  it("ignores a frame older than the series it has", () => {
    const bars = [bar(5), bar(6)]
    expect(mergeBar(bars, bar(4))).toEqual(bars)
  })
})

describe("hasGap", () => {
  // Skipped bars are the designed cost of latest-wins backpressure. They are recoverable only
  // because they are detectable: silently appending would leave a discontinuity on the chart that
  // reads as a real price gap.
  it("spots bars skipped by backpressure", () => {
    expect(hasGap([bar(10)], bar(14))).toBe(true)
  })

  it("accepts the next bar in sequence", () => {
    expect(hasGap([bar(10)], bar(11))).toBe(false)
  })

  it("accepts a repeated index, which is a forming bucket rather than a gap", () => {
    expect(hasGap([bar(10)], bar(10))).toBe(false)
  })

  it("reports no gap against an empty series, which has nothing to be discontinuous with", () => {
    expect(hasGap([], bar(99))).toBe(false)
  })
})

describe("applyFrame", () => {
  const session: ReplaySession = {
    id: "s1", accountId: "a1", feedId: "f1", status: "open", timeframe: "15m", speed: "1",
    cursorIndex: 200, revealedIndex: 200, barsScanned: 201, totalBars: 701,
    startedAt: "", closedAt: null,
  }

  // The server's numbers win outright. The client never asserts where the cursor is (BR-02), so
  // there is nothing to reconcile and no merge rule to get wrong.
  it("takes the server's cursor, edge and status", () => {
    const frame = decodeFrame(JSON.stringify({ ...wireFrame, status: "paused", speed: "5" }))!
    expect(applyFrame(session, frame)).toMatchObject({
      status: "paused", speed: "5", cursorIndex: 214, revealedIndex: 214, barsScanned: 215,
    })
  })

  // A heartbeat proves the socket is alive during a pause, when no bars flow. It carries no
  // position, so folding it in would reset the cursor to zero.
  it("leaves the session untouched on a heartbeat", () => {
    const frame = decodeFrame(JSON.stringify({ kind: "heartbeat" }))!
    expect(applyFrame(session, frame)).toBe(session)
  })
})

describe("nextBackoffMs", () => {
  it("grows exponentially and then caps", () => {
    const highest = () => nextBackoffMs(20, () => 1)
    expect(nextBackoffMs(0, () => 1)).toBeLessThan(nextBackoffMs(3, () => 1))
    expect(highest()).toBeLessThanOrEqual(8_000)
  })

  // The jitter matters more than the curve: an API restart drops every socket at once, and
  // without it they would all come back in lockstep and knock the instance over as it starts.
  it("spreads reconnects across the window rather than firing them together", () => {
    expect(nextBackoffMs(4, () => 0)).not.toEqual(nextBackoffMs(4, () => 1))
  })

  it("never returns a delay short enough to become a busy loop", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect(nextBackoffMs(attempt, () => 0)).toBeGreaterThanOrEqual(250)
    }
  })
})
