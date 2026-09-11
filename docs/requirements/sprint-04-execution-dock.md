# Sprint 04 — Execution dock and order management (frontend)

**Status:** PLANNED · **Estimate:** 8–10 dev-days · **Backend decisions settled:** `SP4-1`..`SP4-5` — see the backend plan review
**Requirements:** FR-EXEC-02/06/07/08/10/11/12, FR-TA-06, FR-UI-09
**PRD:** §3.3
**Consumes:** backend Sprint 04 · **Blocks:** Sprint 05

## Goal

Let the trader act, and make the gate's decisions legible. The UI's job is to show the rules and
report what the server decided — never to be the thing enforcing them.

## Tasks

### 04.1 Order ticket (FR-EXEC-02, FR-EXEC-11)
- Side, type (market / limit / stop), sizing by lots **or** by % equity risk with live conversion.
- Quantity is in **units of the base asset, not lots**, matching the backend's `contract_size` of 1
  (`SP4-3`). The label says so, because "10,000" meaning 10,000 EUR rather than 10,000 lots is the
  difference between a plausible order and one the gate refuses by a factor of 100,000.
- The % equity risk conversion sizes against **equity, not balance** — unrealized losses on open
  positions reduce the headroom, per `SP4-3`. The server is authoritative; the ticket must not show
  a larger affordable size than the gate will accept, or every rejection looks like a bug.
- Stop loss is a required field — the form cannot be submitted without one, mirroring BR-03. The
  server still enforces it; the UI simply refuses to waste a round trip.
- Live R:R as the trader edits the stop and target, in `.metric` type.
- A `client_key` (UUID) is minted per ticket and **reused on retry**, so a network retry cannot
  double-fill.
- **No optimistic UI for order placement.** An order that appears to fill and then vanishes is
  worse than one that takes 80ms. Pending state is shown honestly.

### 04.2 Rule compliance panel (FR-EXEC-06)
- The four checks from the design (max daily drawdown, hard SL attached, R:R above minimum, plus
  open-position headroom) with live pass/fail.
- **The drawdown row shows how much room is left and nothing about when the window resets.** Per
  backend decision `SP4-1`, a day is a market day computed server-side and the boundary never
  crosses the wire: the payload carries `room_remaining_pct` and a halted flag, and there is no
  timestamp, day ordinal or bar count to derive a countdown from. This is BR-01, not an oversight in
  the API — a trader who can see where the resets fall sees a two-day gap every five days and has
  identified a weekend, which narrows the instrument set. Do not compute a countdown from bar
  indices to fill the gap; there is nothing to compute it from, and adding one would be the leak.
- On rejection, the server's specific code is rendered as its own message — `RISK_REWARD_TOO_LOW`
  says the R:R was too low, not "invalid request". A generic error teaches nothing, and the whole
  point of the gate is that it teaches.
- **Rejections are shown as rejections.** The UI never silently substitutes a corrected value; a
  trader who never sees their order refused never learns their sizing is wrong.

### 04.3 On-chart brackets (FR-TA-06)
- Interactive long/short bracket overlay: entry, stop and target as draggable lines with live
  target pips, stop risk in $ and %, and R:R.
- Dragging a line issues a bracket `PATCH`; the render follows the server's response, not the drag.

### 04.4 Position actions (FR-EXEC-07, FR-EXEC-08)
- Set breakeven, close 50%, close position, close all.
- `Close all` is destructive across positions and confirms; the others do not — a confirm on every
  action trains people to click through confirms.

### 04.5 Tables (FR-EXEC-10)
- Open positions / pending orders / session trades, tabbed, at the design system's 22px dense rows.
- Columns per the design: order id, asset mask, side, size, entry, current, TP, SL, unrealized PnL,
  actions. Numeric columns right-aligned in `.metric`.
- Rejected orders appear in a filterable view rather than being hidden — they are part of the
  record the discipline index is built from.

### 04.6 Keyboard (FR-EXEC-12)
`B` buy, `S` sell, `Space` step, `Esc` cancel the active ticket. A discoverable shortcut map, and
every shortcut has a visible control — a keyboard-only action is invisible to a new trader.

### 04.7 Mobile execution slip (FR-UI-09)
Bottom-sheet order slip with risk presets, a thumb-reachable submit, and the same compliance panel.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 04-AC-1 | An empty stop-loss field | Submit attempted | Blocked client-side with a field message; no request sent |
| 04-AC-2 | An order the server rejects with `RISK_REWARD_TOO_LOW` | Response received | That specific reason is shown; the ticket keeps the trader's values |
| 04-AC-3 | A rejected order | Tables inspected | It appears in the rejected view with its reason |
| 04-AC-4 | A submit that times out | Retried | Same `client_key`; exactly one order exists server-side |
| 04-AC-5 | A drag of the stop line | Released | `PATCH` issued; the rendered line matches the server's stored value, not the drag position |
| 04-AC-6 | A halted session (drawdown breached) | Ticket opened | Submission disabled with the halt stated, not a generic error |
| 04-AC-7 | `B` pressed with a chart focused | — | Buy ticket opens; the same action exists as a visible button |
| 04-AC-8 | 390px | Order placed via the slip | Same gate feedback as desktop |
| 04-AC-9 | A session whose bars cross a market-day boundary | Compliance panel inspected | Room remaining is shown; no countdown, reset time or day number appears anywhere (`SP4-1`) |
| 04-AC-10 | An open position at an unrealized loss | % equity risk sizing read | The affordable size reflects the loss, matching what the gate will accept (`SP4-3`) |

## Test plan
- Component tests for the ticket's sizing conversion and R:R maths (decimal, never float).
- Tests per rejection code asserting each renders its own message.
- A blinding test in the style of `src/features/feed/blinding.test.ts` over the risk and order view
  models, asserting no day boundary is derivable from what the panel holds (`SP4-1`).
- Playwright: place an order that the gate refuses, then one it accepts, and assert both outcomes.

## Definition of done
A trader can size, place, adjust and close positions, and every gate rejection is legible.
