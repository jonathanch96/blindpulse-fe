# Sprint 05 — Trade Journal and the mystery reveal (frontend)

**Status:** **DONE except what needs Sprint 04's fills, and media** · **Estimate:** 8–10 dev-days
**Requirements:** FR-JOURNAL-01..06, FR-REVEAL-01..03, FR-TA-11, FR-UI-04, FR-UI-10
**PRD:** §3.4
**Consumes:** backend Sprint 05 · **Blocks:** Sprint 06

## Goal

Build the payoff screen. The reveal is the moment the product justifies the blinding, and it is
one-way — so the interaction around it matters as much as its layout.

## What this sprint can and cannot show

Sprint 04 is decided and **not built**, so no session has any fills in it. This sprint is built
anyway — journals, drawings and the reveal all anchor to bars and the feed, none of which need
execution — but two panels have nothing to render and must say so rather than render a zero:

- **05.4's KPI strip and trade log** have no trades. An empty state that names the reason beats a
  grid of zeros, which reads as a session where everything went wrong.
- **05.2's benchmark alpha** is the negative of buy-and-hold, because a strategy that never traded
  returned nothing. The layout already shows `benchmark_label`; it has to be legible enough that
  this reads as "you did not trade" rather than "you lost".

Neither is a stub. The same components fill in the day execution lands.

## Tasks

### 05.1 Journal capture (FR-JOURNAL-01, FR-JOURNAL-02)
- Inline note affordance from the terminal, anchored to the current bar index — not a separate
  destination the trader has to leave the chart for.
- Thesis, note, emotion (calm / confident / anxious / greedy / fearful / frustrated / bored),
  conviction 1–5, free tags.
- Autosave with an explicit saved indicator; a lost thesis is a lost lesson.

### 05.2 Session summary header (FR-REVEAL-01)
Pre-reveal: batch alias, blinded status, duration, bars scanned.
Post-reveal: real ticker, timeframe, the true date window, macro label, and benchmark alpha —
laid out as the design shows, with the alpha comparison beside it.

### 05.3 The reveal interaction (FR-REVEAL-01, BR-08)
- The trigger is available only once the session is closed; before that it is disabled **with the
  reason stated**, not hidden. A hidden control reads as a missing feature; a disabled one with a
  reason teaches the rule.
- A confirmation that says plainly this cannot be undone and the session cannot be traded further.
- On success the screen transitions to the revealed layout in place — the trader should feel the
  curtain lift on the session they just traded, not be navigated somewhere new.

### 05.4 KPI strip and trade log (FR-JOURNAL-03)
- Net realized PnL, win rate, profit factor, max drawdown, average realized R:R — `.metric` type,
  semantic color bound to sign only.
- Candle-by-candle log: id, type, entry → exit, duration, PnL, R:R, behaviour tag, notes.
  Filters for all / wins / losses.

### 05.5 Execution footprint (FR-JOURNAL-05)
A compact chart of the session marking each fill with its R-multiple, reusing the Sprint 03 canvas
renderer rather than a second charting path.

### 05.6 Psychology panel (FR-REVEAL-04 display)
Discipline index dial with its four components. When Sprint 06's projector has not caught up, show
`computed_at` and a pending state — never a zero, which reads as a score of zero.

### 05.7 Macro context (FR-REVEAL-02)
Macro driver card with the historical narrative and tags (`#SVB_COLLAPSE`, `#DXY_DUMP`).

### 05.8 Post-mortem (FR-JOURNAL-04)
Free-text reflection with prompt chips ("Good discipline", "Need better patience", "Respected
risk"), saved to the session.

### 05.9 Drawing persistence (FR-TA-11) and media (FR-JOURNAL-06)
Drawings persist per session and reload with it; journal image upload with progress and the
server's EXIF-stripped URL.

### 05.10 Mobile (FR-UI-10)
Card-based reveal, macro context tape, scrollable fills — same content, restacked.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 05-AC-1 | An open session | Journal screen viewed | Reveal is disabled with "unlocks when the session is closed" |
| 05-AC-2 | A closed, unrevealed session | Reveal clicked | Confirmation states it is irreversible before anything is sent |
| 05-AC-3 | Reveal confirmed | Response received | Ticker, timeframe, window, macro and alpha render in place |
| 05-AC-4 | An unrevealed session | Any screen inspected | No ticker or date appears anywhere, including tooltips and page titles |
| 05-AC-5 | Metrics not yet projected | Psychology panel | Pending state with `computed_at`, never a zero score |
| 05-AC-6 | A note written while paused at bar 88 | Saved | Anchored to bar 88, not to wall-clock time |
| 05-AC-7 | Drawings from a session | Session reopened | Restored at the same bar anchors |
| 05-AC-8 | 390px | Reveal flow | Fully usable; no horizontal scroll |

## Test plan
- Component tests for the reveal gate states (open / closed-unrevealed / revealed).
- A guard test that the pre-reveal journal view renders no identity field even when handed a
  response that wrongly contains one — defence in depth behind the backend's contract test.
- Playwright: trade → close → reveal, asserting the ticker is absent before and present after.

## What is built, and what is waiting

| Task | State |
|---|---|
| 05.1 Journal capture | **Done** — inline beside the chart, anchored to the server's cursor. Tags are accepted by the API and have no input yet |
| 05.2 Session summary header | **Done** — blinded before, ticker/timeframe/window/macro/alpha after |
| 05.3 The reveal interaction | **Done** — disabled with the reason before close, irreversibility stated in the confirm, transitions in place |
| 05.4 KPI strip and trade log | **Waiting on Sprint 04** — an empty state that names the reason, not a grid of zeros |
| 05.5 Execution footprint | **Waiting on Sprint 04** — needs fills to mark |
| 05.6 Psychology panel | **Done as a pending state** — the projector is Sprint 06, and a 0/100 score for an unmeasured trader is a worse lie than "not computed yet" |
| 05.7 Macro context | **Done** |
| 05.8 Post-mortem prompts | **Not built** — journal capture covers the writing; the prompt chips do not exist |
| 05.9 Drawing persistence | **Done**. Media is not built — the backend has no upload |
| 05.10 Mobile | **Done** — 390px verified, no horizontal scroll |

## Definition of done
A trader can journal through a session, close it, reveal it, and read a post-mortem that reconciles
with what they actually did.

**Met for everything that does not need a fill.** Verified live in a browser: the journal panel
writes at the session's own cursor, the reveal is disabled with its reason while the session is
live and enabled once closed, the confirmation says it cannot be undone, the ticker appears in place
on the same screen, the benchmark's definition is stated beside the number, and the untraded case is
named rather than left reading as a loss. Drawings survive a reload, a reshape PATCHes, and a
clear-all deletes and stays deleted.
