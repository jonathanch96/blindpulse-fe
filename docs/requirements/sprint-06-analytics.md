# Sprint 06 — Performance Analytics and cross-iteration (frontend)

**Status:** PLANNED · **Estimate:** 8–10 dev-days
**Requirements:** FR-ANALYTICS-01..09, FR-ACCT-06..09, FR-TA-09, FR-UI-06, FR-UI-11
**PRD:** §3.5, §4
**Consumes:** backend Sprint 06

## Goal

Show the trader whether they are actually improving, across sessions and across the iterations they
blew up. Every chart here follows the same semantic palette — no visualization invents a hue.

## Tasks

### 06.1 Analytics dashboard (FR-UI-06, FR-ANALYTICS-01..03)
- Scope selector (last 30 / 90 / all) and a dataset-integrity chip.
- KPI row: total replays, net return, win rate, expectancy, Sharpe, profit factor — with the
  secondary metric under each, per the design.

### 06.2 Charts (FR-ANALYTICS-02/04/06/07/08)
- Cumulative growth vs drawdown baseline (dual series, drawdown as a filled negative band).
- R-multiple outcome distribution: negative in bearish, positive in bullish, scratch in neutral —
  the palette carries the meaning, so the legend is a convenience rather than the key.
- Streak dispersion: consecutive win and loss occurrence bars.
- Session alpha by liquidity window; asset-class split, **labelled as post-reveal only** so the
  numbers are not read as covering everything the trader has traded.

### 06.3 Rule adherence and R:R realization (FR-ANALYTICS-05)
Protocol-compliance percentage with its contributing counts (clean executions, FOMO tags, revenge
or early exits, average cooldown after a loss), and a planned-vs-realized R:R panel including
slippage drag.

### 06.4 Cross-iteration equity overlay (FR-ACCT-06)
- Multi-instance normalized equity trajectories on the Accounts screen: every iteration as a
  percent-of-its-own-start curve, so branches with different starting capital are comparable.
- Legend per iteration with its return; the active branch emphasized, sealed ones muted.

### 06.5 Meta-learning matrix (FR-ACCT-08)
Per-branch table: strategy profile, planned risk, max drawdown reached, return, and an inspect-log
action.

### 06.6 Forking (FR-ACCT-07, FR-ACCT-09)
Quick-fork templates ($10k / $50k / $100k) and "fork selected profile", cloning an earlier
iteration's risk policy and strategy profile into a new one.

### 06.7 MACD (FR-TA-09) and CSV export (FR-ANALYTICS-09)
MACD histogram added to the terminal's sub-chart options; CSV export streamed from the backend
rather than assembled in the browser — a large export must not depend on the tab staying open.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 06-AC-1 | A discipline index of 82 | Rendered | Its four components are shown; a low score is traceable to a behaviour |
| 06-AC-2 | Sessions including unrevealed ones | Asset-class split | Only revealed sessions counted, and the panel says so |
| 06-AC-3 | Iterations starting at $10k and $50k | Equity overlay | Both normalized to percent and visually comparable |
| 06-AC-4 | Zero losing trades | Profit factor | Rendered as "undefined", never ∞ or 0 |
| 06-AC-5 | Any chart | Both themes | Semantic palette holds; no hardcoded hue |
| 06-AC-6 | Projector behind | Dashboard | Staleness shown via `computed_at`, not a silent stale number |
| 06-AC-7 | Export requested | Clicked | Streams from the backend; a large file does not block the UI |
| 06-AC-8 | 390px | Accounts | Branch switcher and recovery meter usable (FR-UI-11) |

## Test plan
- Chart component tests over degenerate data: zero trades, all wins, a single trade, one iteration.
- Palette test asserting no feature file contains a literal color.
- Playwright: analytics renders real numbers from a traded, revealed session.

## Definition of done
Every PRD §4 analytics screen renders real data, in both themes, at desktop and mobile.
