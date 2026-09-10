# ADR 0001 — Render the price chart on a custom canvas

**Status:** Accepted · **Date:** 2026-09-10 · **Slice:** 03D
**Requirements:** NFR-02 (60 FPS at 10x with overlays), FR-TA-01..10, FR-TA-11 (03F drawing tools)

## Context

The Replay Terminal must sustain 60 FPS during 10x playback with candles, volume, three EMAs, an
RSI sub-chart and — from slice 03F — fibonacci levels, trendlines and supply/demand zones drawn on
top. That is a 16.7 ms budget for a complete frame.

Two things about this chart are unusual and they drive the decision:

1. **The x-axis is a bar index, not a time.** Blinding works by never sending an absolute
   timestamp (BR-01), so a bar is identified by its position in the feed. Every general-purpose
   financial charting library is built around a time scale.
2. **Drawing tools anchor to bar indices** and need hit-testing, dragging and magnet-to-OHLC
   behaviour we control precisely.

## Options measured

Both benchmarks ran in the same Chromium build used for the e2e suite, warmed up, 150–300 frames,
full redraw each frame.

| Option | What was drawn | p50 | p95 | p99 |
|---|---|---|---|---|
| **Canvas 2D** | 500 candles + volume + 3 EMAs + RSI | 0.40 ms | 1.10 ms | **4.40 ms** |
| **SVG DOM** | 500 candles **only** — no volume, EMAs or RSI | 3.50 ms | 6.00 ms | **7.00 ms** |

The SVG figure is the generous one: it excludes every overlay the canvas figure includes, and it
still costs 1.6× more. Adding volume, three EMA polylines and an RSI series roughly triples the
element count, which puts a complete SVG frame at or past the 16.7 ms budget before slice 03F adds
a single drawing tool. Canvas draws the whole frame with ~4× headroom.

So the honest statement is not "SVG cannot draw candles" — at 7 ms it can. It is that **SVG has no
headroom left for the overlays and drawing tools this terminal is specified to carry**, and canvas
has plenty.

## Options considered and rejected

**`lightweight-charts` (TradingView).** Fast, canvas-based, and the obvious default. Rejected on
the axis: its time scale requires real timestamps, so a blinded feed would have to synthesize a
fake time series purely to satisfy it. That is a blinding hazard — it puts a plausible-looking
timeline in client memory, and it invites a later change to "just use the real timestamps, they're
right there". Its drawing primitives are also constrained relative to the fibonacci, zone and
trendline suite in PRD §3.2.

**A commercial stock charting library.** Same time-axis assumption, plus licence cost, plus a
large dependency for a chart whose specification we already know precisely.

**Custom canvas renderer.** Chosen. No dependency, an index-based x-axis that matches how the
product actually works, and complete control over the two renderings that carry meaning here: the
forming bar (drawn hollow, never as a closed candle) and the drawing-tool layer to come.

## Decision

Render on a custom `<canvas>`, split into two layers:

- a **static layer** redrawn when the bar window, timeframe or scale mode changes — candles,
  volume, EMAs, RSI;
- an **interaction layer** redrawn per pointer move — crosshair, active drawing, brackets.

The measurement above says a single-layer full redraw would already fit the budget. The split is
kept anyway because slice 03F's drag interactions redraw on every pointer event, and paying for a
full candle redraw per mouse move would waste the headroom this decision bought.

## Consequences

- Axes, gridlines, crosshair, hit-testing and the drawing tools are ours to write. That is the cost.
- Numeric conversion for pixel geometry lives in `src/lib/chart-math.ts`, outside `src/features/**`
  where ESLint bans `Number()`. The ban protects *money* arithmetic; pixel geometry is not money,
  and the exception is one documented file rather than a loosened rule. (This mirrors `pkg/stats`
  on the backend, which exists for the same reason.)
- Theme colours are read from the CSS custom properties, so both design systems work without a
  second palette living in the renderer.
- The 60 FPS claim is re-measured in the browser as part of slice 03D and the number is recorded,
  rather than being inherited from this benchmark.
