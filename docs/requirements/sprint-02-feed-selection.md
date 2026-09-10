# Sprint 02 — Feed selection (frontend)

**Status:** DONE · **Estimate:** 4–5 dev-days
**Requirements:** FR-FEED-05..07, FR-UI-07 (entry point)
**PRD:** §3.1
**Consumes:** backend Sprint 02 · **Blocks:** Sprint 03

## Goal

Let a trader pick or be assigned a blinded feed, and make the blinding legible — the trader should
understand they are being deliberately denied information, not that the UI is missing data.

## Tasks

### 02.1 Feed catalogue
- `/terminal/feeds` (or a dialog from the terminal): cards showing alias, masked asset-class hint,
  difficulty chip, bar count, base timeframe class.
- The card renders exactly the fields the API returns. There is no "symbol" field to leave blank,
  because the type has no such field (`src/features/feed/types.ts` mirrors the blinded response).
- Filters: difficulty, timeframe class, unseen-only.

### 02.2 Randomize
- "Randomize new starting point" calls `POST /feeds/random` and opens a session directly.
- Deliberate friction: a confirm step, because starting a session commits the account's next
  drawdown window.

### 02.3 Blinding affordances (FR-FEED-05)
- The persistent `BLIND MODE ACTIVE` chip (already built) plus an `Asset & Date Hidden` readout.
- Relative tick offsets everywhere a date would go: `T-140`, `T-0 Live Playhead`, `Future Window`.
  Never a formatted date, never a relative-to-*today* string — "3 years ago" is a date.
- A short explainer on first use: what is hidden and why, so the masking reads as the product
  rather than as a defect.

### 02.4 Type generation
`pnpm gen:types` from the backend swagger, with `check:types-generated` in CI so a backend contract
change that the frontend has not absorbed fails the build rather than surfacing at runtime.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 02-AC-1 | A feed catalogue response | Rendered | No date, symbol or instrument id appears anywhere on screen |
| 02-AC-2 | A feed card | Inspected in devtools | The fetched JSON itself contains no such field — the guard is the API, the UI is the second layer |
| 02-AC-3 | Randomize | Clicked | Confirm step, then a session opens on a feed the user has not traded |
| 02-AC-4 | A backend contract change | CI | `check:types-generated` fails until types are regenerated |
| 02-AC-5 | Any date-shaped value | Rendered | Shown as a relative tick offset, never a calendar date or a "N years ago" string |

## Test plan
- Component tests for the card and the empty/error states.
- A guard test asserting the feed type has no identity-bearing field, so adding one requires
  deleting the test on purpose.

## Definition of done
A trader can browse or randomize a feed, with nothing on screen that could identify the instrument.

## Delivered

`/feeds` renders the catalogue with difficulty and timeframe filters, a randomize action, and a
confirm dialog. `src/features/feed/types.ts` mirrors the backend's blinded contract and has no
field for a symbol, an instrument id or a window — `blinding.test.ts` fails the build if one
appears, and was verified to fail when identity fields were deliberately added.

Two deviations from the plan, both deliberate:

- **Starting a session is not wired.** The dialog says so in words instead of shipping a button
  that looks live and does nothing; `POST /sessions` arrives in Sprint 03.
- **`src/proxy.ts` lost its `/account/:path*` matcher**, which protected a route that has never
  existed — a leftover from the tripmate port found while adding `/feeds`. The account settings
  screen it implied is still missing, and `FR-AUTH-04` is marked accordingly.
