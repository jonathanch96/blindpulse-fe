# Sprint 03 — Replay Terminal (frontend)

**Status:** IN PROGRESS · **Estimate:** 15–18 dev-days — the largest frontend sprint

## Delivery slices

Shared numbering with `blindpulse-be`. This document covers the frontend slices.

| Slice | Scope | Status |
|---|---|---|
| 03C | Session wiring — start from a feed, transport, progress, timeframe, rewind banner | **DONE** |
| 03D | Chart canvas at 60 FPS with EMAs, RSI and scale modes | **DONE** |
| 03E | Websocket streaming, reconnect and backpressure | **DONE** |
| 03F | Drawing tools — fibonacci, trendlines, zones | Planned |

03C ships an SVG candle strip rather than the canvas: enough to see price action and prove the
cursor moves, deliberately not the chart. 03D replaces it, because SVG cannot hold 60 FPS at 10x
with overlays (NFR-02) — the spike behind that claim is measured in
[`docs/adr/0001-chart-rendering.md`](../adr/0001-chart-rendering.md).

### Slice 03E — delivered

`useReplayStream` holds one socket per session and folds frames into the query cache. The server
drives; this renders what it is told, and sends exactly one message — a hello announcing where it
thinks it is, only after detecting a gap. The server answers with its own cursor either way, so
the claim changes nothing (BR-02).

- `src/features/session/stream.ts` — the pure half: `decodeFrame` (the only place that knows the
  wire is snake_case, because frames come from the Go API rather than through the BFF and nothing
  camelized them), `mergeBar`, `hasGap`, `applyFrame`, `nextBackoffMs`.
- `mergeBar` replaces the last bar when the index repeats and appends when it advances. One rule:
  on a higher timeframe the tail bar is the forming bucket whose index repeats until it closes, so
  the same path animates the forming bar and lands the closed one.
- `hasGap` makes latest-wins backpressure recoverable. Skipped bars are detectable, so the client
  refetches the window rather than drawing a chart with a hole that reads as a real price gap.
- Reconnect backs off exponentially with **full jitter**: an API restart drops every socket at
  once, and without jitter they would all return in lockstep and knock the instance over as it
  comes up.
- `src/app/api/sessions/[id]/stream-ticket/` mints the ticket and resolves the socket URL
  server-side. The browser never builds it, so deployment topology stays where it is configured.
- The bars query key lost its revealed-edge segment. Under 03C a step invalidated the window and
  refetched it; at 10x that would now be forty round trips a second. Freshness comes from the
  socket and from the gap check.
- The terminal shows the FR-REPLAY-08 latency readout beside a connection state, and reports that
  state honestly — a terminal that looks live while its socket is down has the trader reading a
  frozen chart as a quiet market.

**A bug this slice found:** a configured `wss://` was silently downgraded to `ws://`, because the
scheme mapping was a blanket "https means wss, everything else means ws". Dropping TLS because of
a config format is not a decision that function gets to make. The architecture guard also stopped
naming one allowed file and now asserts the property it cares about — that every module reading a
deployment address is under `lib/server` *and* carries the `server-only` import.

**Measured live:** 4–6ms latency at the socket, pause stops the clock, 10x releases ~27 bars/s,
and killing the API flips the badge to RECONNECTING and recovers with the position intact.

### Slice 03D — delivered

- `docs/adr/0001-chart-rendering.md` — the rendering decision, taken against measured numbers
  rather than asserted: canvas draws the complete frame (candles + volume + 3 EMAs + RSI) in
  **4.4 ms p99**; SVG needs **7.0 ms p99** for the candles alone. `lightweight-charts` was rejected
  on the drawing-tool and server-cursor requirements, not on speed.
- `src/lib/chart-math.ts` — the pure numeric kernel: `toPlotValue`, `buildScale` for
  `auto | log | percent`, `niceTicks`, `ema`, `rsi` (Wilder's). This is the one **documented
  exception** to the money-arithmetic lint rule: pixel geometry is float work by nature, and the
  boundary is enforced by the rule covering every other slice.
- `src/features/chart/` — `theme.ts` (palette read from the CSS custom properties, so the chart
  follows the theme toggle rather than hard-coding colours), `render.ts` (layout + the pure
  `drawFrame`), `price-chart.tsx` (two stacked canvases, DPR-aware, `ResizeObserver`, Pointer
  Events), `scale-mode-toggle.tsx`.
- The crosshair reads OHLC out on the interaction layer only; the price layer is not redrawn on
  pointer move.
- The forming higher-timeframe bar is dashed and hollow (`setLineDash([2, 2])` + `strokeRect`),
  never a closed candle (03-AC-4).
- A `sr-only` `role="status"` summary gives the canvas a text alternative, since a canvas is
  otherwise opaque to a screen reader.
- The eslint money rule was widened to the `session`, `feed` and `chart` slices; it immediately
  caught the `Number()` calls in the 03C SVG strip, which 03D deletes.

**NFR-02 measured in the browser**, 200 bars released at 10x with EMAs and RSI live:
**60.3 FPS sustained over 182 frames, 0 dropped frames, inter-frame gap p99 16.80 ms.** The first
measurement was discarded because it timed `requestAnimationFrame` *pacing* (which is capped at the
display's 60 Hz and so can only ever report ~60) rather than draw cost; the recorded number pairs
the pacing with the dropped-frame count, which is the part that can actually fail.

Two items from the plan below are deliberately **not** in 03D:
- **Indicators in a worker** (03.6) — unnecessary at the measured cost. EMA and RSI over the
  visible window are ~1 ms; a worker would add a postMessage hop and a second copy of the bar array
  to save nothing. Revisit only if a heavier indicator lands.
- **The offscreen buffer** (03.1) — the two-layer split already keeps pointer moves off the price
  layer, and the static layer redraws in 4.4 ms. Adding a third surface would be speculative.
**Requirements:** FR-REPLAY-02..08, FR-TA-01..05/07/08/10, FR-UI-03/08/12, NFR-02, NFR-04
**PRD:** §3.1, §3.2, §6.2, §6.4
**Consumes:** backend Sprint 03 · **Blocks:** Sprints 04, 05

## Goal

Build the screen the product is judged by, at the frame rate the PRD demands (NFR-02: 60 FPS at
10x with overlays). This is the sprint where an architectural mistake is expensive, so the
rendering decision is made first and measured immediately.

## Tasks

### 03.1 Chart rendering (FR-TA-01, NFR-02)
- `<canvas>` with an offscreen buffer. **Not** SVG or DOM nodes per candle: 500 candles plus three
  EMAs, fib levels and zone boxes is thousands of nodes, and 60 FPS at 10x is not reachable through
  layout and paint.
- Two layers: a static layer (candles, volume, indicators) redrawn only when the window changes,
  and an interaction layer (crosshair, active drawing, brackets) redrawn per pointer move.
- `requestAnimationFrame` loop with frame budgeting: if a frame would overrun, skip the
  interaction redraw rather than the price redraw.
- Device-pixel-ratio aware; resize observed rather than polled.
- **Library decision is made in this sprint's first two days**, evaluated against: custom drawing
  tools, a server-driven cursor, and 10x playback. Candidates: `lightweight-charts` (fast, but
  custom tools are constrained), a `d3-scale` + custom canvas renderer (full control, more work),
  or a full commercial library. Recorded in an ADR under `docs/adr/`.

### 03.2 Websocket client (FR-REPLAY-05)
- `useReplayStream(sessionId)`: connect, authenticate, subscribe, heartbeat, exponential reconnect.
- On reconnect, send the last seen index and **accept the server's cursor** — the client never
  asserts where it is (BR-02).
- Backpressure: render the newest frame and drop intermediates. A stale frame is worse than a
  skipped one, because the trader acts on what is on screen.
- Latency readout from the frame envelope (FR-REPLAY-08).

### 03.3 Transport controls (FR-REPLAY-02..04)
- Step back / play-pause / step forward; `Space` steps (FR-EXEC-12 partial).
- Speed segmented control 0.5x / 1x / 3x / 5x / 10x, active state in telemetry cyan per the design
  system.
- Progress: `142 / 500 bars scanned` with a scrub rail. Scrubbing forward past the cursor is
  disabled, not clamped — a disabled control tells the truth about why.

### 03.4 Timeframe switching (FR-REPLAY-06)
- 1m / 5m / 15m / 1h / 4h / 1D over the same cursor.
- A forming higher-timeframe bar is drawn distinctly (hollow / dashed), never as a complete candle,
  since a complete 1h bar would show 59 minutes of future.

### 03.5 Drawing tools (FR-TA-02..05)
- Left ribbon of 32px targets, active tool marked by a 2px cyan strip per the design system.
- Trendline, horizontal line, ray, extended line, vertical line.
- Fibonacci retracement with the PRD's exact levels (0, .236, .382, .500 Equilibrium,
  .618 Golden Pocket, .786, 1.0) and trend-based extensions.
- Supply/demand boxes with adjustable shading; polyline, brush, annotation note.
- Anchors are **bar indices**, never timestamps — a timestamp in a drawing is a date leak.
- Hit-testing, selection, drag-to-move, delete; magnet-to-OHLC snapping.
- Persistence is Sprint 05 (FR-TA-11); this sprint keeps drawings in session state.

### 03.6 Indicators (FR-TA-07, FR-TA-08, FR-TA-10)
- RSI(14) sub-chart with 30/70 bands; dual EMAs (20/50/200); volume profile.
- Scale modes `LOG` / `AUTO` / `%`.
- Computed in a worker so indicator maths never blocks the render loop.

### 03.7 Mobile terminal (FR-UI-08, FR-UI-12, NFR-04)
- Single-pane workspace at 390px; toolbar in an overlay drawer; persistent bottom action bar.
- Touch: pinch-zoom, drag crosshair, tap-to-step, swipe-up sheets.
- Pointer Events throughout, so one code path serves mouse, touch and pen.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 03-AC-1 | 500 candles, 3 EMAs, RSI, 5 fib levels, 3 zones | 10x playback, 5 minutes | ≥ 60 FPS sustained; frame drops recorded and within budget |
| 03-AC-2 | A running session | Websocket dropped and restored | Playback resumes from the server's cursor with no duplicated or skipped bar |
| 03-AC-3 | A client 20 frames behind | Observed | Newest frame rendered; intermediates dropped, not queued |
| 03-AC-4 | 15m at bar 142 | Switched to 1h | Completed 1h bars drawn solid, the forming one visibly distinct |
| 03-AC-5 | A fib retracement drawn | Inspected | Levels exactly per PRD §3.2, anchored by bar index |
| 03-AC-6 | Any date-shaped axis label | Rendered | Relative tick offset only |
| 03-AC-7 | 390px viewport | Pinch, drag, tap-to-step | All gestures work; no hover-only affordance is required to trade |
| 03-AC-8 | Scrub rail | Dragged past the cursor | Disabled beyond it, with a reason surfaced |

## Test plan
- **Performance:** an automated frame-rate harness over a scripted 10x session; the number goes in
  the PR. NFR-02 is proven here, not in Sprint 07.
- **Component:** transport state machine, timeframe switching, drawing hit-tests.
- **Playwright:** desktop and the 390px mobile project driving a full session.

## Definition of done
A trader can open a session, play it at any speed, step, switch timeframes, draw, and read
indicators — with the frame-rate number recorded.

## Risks

| Risk | Mitigation |
|---|---|
| The library choice cannot carry custom tools at 10x | Decided and measured in the first two days against a spike, before anything is built on it |
| 60 FPS unreachable on mid-range hardware | Layer split and frame budgeting from the start; degrade by simplifying overlays before dropping price frames |
| Touch gestures conflicting with drawing | Explicit gesture arbitration: one-finger draws when a tool is active, two-finger always pans/zooms |
