import type { ReplaySession, SessionBar, SessionStatus } from "@/features/session/types"

// The replay stream contract.
//
// Frames arrive from the Go API directly rather than through the BFF, so nothing has camelized
// them on the way — `decodeFrame` is where that happens, and it is the only place that knows the
// wire is snake_case.
//
// A frame carries no date. It cannot: the session is blinded, and a timestamp is the thread a
// trader pulls to identify the instrument (NFR-05). What it carries instead is `latencyMs`, the
// time the server measured between releasing the bar and writing this frame to the socket.

export type ReplayFrameKind = "sync" | "bar" | "state" | "heartbeat"

export type ReplayFrame = {
  kind: ReplayFrameKind
  status: SessionStatus
  timeframe: string
  speed: string
  cursorIndex: number
  revealedIndex: number
  barsScanned: number
  totalBars: number
  latencyMs: number
  bar?: SessionBar
}

export type StreamStatus = "idle" | "connecting" | "live" | "reconnecting" | "offline"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === "string" ? value : ""
}

function decodeBar(value: unknown): SessionBar | undefined {
  if (!isRecord(value)) return undefined
  const index = value.index
  if (typeof index !== "number") return undefined
  return {
    index,
    open: readString(value, "open"),
    high: readString(value, "high"),
    low: readString(value, "low"),
    close: readString(value, "close"),
    volume: readString(value, "volume"),
    forming: value.forming === true,
  }
}

// decodeFrame is deliberately defensive. This is the one payload in the app that does not come
// through the BFF's envelope handling, so a malformed or unexpected message must be discarded
// rather than allowed to reach the chart as NaNs.
export function decodeFrame(raw: string): ReplayFrame | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(parsed)) return null
  const kind = parsed.kind
  if (kind !== "sync" && kind !== "bar" && kind !== "state" && kind !== "heartbeat") return null
  return {
    kind,
    status: (readString(parsed, "status") || "open") as SessionStatus,
    timeframe: readString(parsed, "timeframe"),
    speed: readString(parsed, "speed"),
    cursorIndex: readNumber(parsed, "cursor_index"),
    revealedIndex: readNumber(parsed, "revealed_index"),
    barsScanned: readNumber(parsed, "bars_scanned"),
    totalBars: readNumber(parsed, "total_bars"),
    latencyMs: readNumber(parsed, "latency_ms"),
    bar: decodeBar(parsed.bar),
  }
}

// mergeBar replaces the last bar when the index repeats and appends when it advances.
//
// One rule covers both cases the chart needs. On a higher timeframe the tail bar is the forming
// bucket, whose index repeats across frames until it closes — so the same code path animates the
// forming bar and lands the closed one, with no aggregation logic in the client to get wrong.
export function mergeBar(bars: SessionBar[], bar: SessionBar): SessionBar[] {
  if (bars.length === 0) return [bar]
  const last = bars[bars.length - 1]
  if (bar.index === last.index) return [...bars.slice(0, -1), bar]
  if (bar.index > last.index) return [...bars, bar]
  // An older index means the series was rewound or refetched under us. Leave it alone: the
  // authoritative window is whatever the last fetch returned, not a frame that arrived late.
  return bars
}

// hasGap reports that bars were skipped between what we have and what just arrived.
//
// Skipped bars are the designed cost of latest-wins backpressure: when a socket falls behind, the
// server collapses the queue and sends only the newest frame. That is recoverable exactly because
// this is detectable — the client refetches the window rather than drawing a chart with a hole in
// it. Silently appending would leave a discontinuity that looks like a real price gap.
export function hasGap(bars: SessionBar[], bar: SessionBar): boolean {
  if (bars.length === 0) return false
  return bar.index > bars[bars.length - 1].index + 1
}

// applyFrame folds a frame into the session the UI renders. The server's numbers win outright:
// the client never asserts where the cursor is (BR-02), so there is nothing to reconcile.
export function applyFrame(session: ReplaySession, frame: ReplayFrame): ReplaySession {
  if (frame.kind === "heartbeat") return session
  return {
    ...session,
    status: frame.status || session.status,
    timeframe: frame.timeframe || session.timeframe,
    speed: frame.speed || session.speed,
    cursorIndex: frame.cursorIndex,
    revealedIndex: frame.revealedIndex,
    barsScanned: frame.barsScanned,
    totalBars: frame.totalBars || session.totalBars,
  }
}

const baseBackoffMs = 500
const maxBackoffMs = 8_000

// nextBackoffMs backs off exponentially with jitter. The jitter matters more than the curve: an
// API restart drops every socket at once, and without it they would all return in lockstep and
// knock the instance over again as it comes up.
export function nextBackoffMs(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(baseBackoffMs * 2 ** Math.max(0, attempt), maxBackoffMs)
  // Full jitter over the window, floored so a retry storm cannot become a busy loop.
  return Math.round(baseBackoffMs / 2 + random() * (exponential - baseBackoffMs / 2))
}
