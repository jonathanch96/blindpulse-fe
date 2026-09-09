# BlindPulse Replay Lab — frontend delivery plan

Companion to `../blindpulse-be/PLAN.md`. Sprint numbers match: FE sprint *n* consumes BE sprint *n*.

---

## 1. Architecture

Next.js 16 App Router as a **backend-for-frontend**, identical in shape to `tripmate-fe`:

```
browser ──same-origin /api/*──→ Next route handler ──Bearer──→ Go service
                                (server-only module)
```

The browser never learns the Go service URL and never holds a token. NextAuth keeps the access and
refresh pair in its encrypted, httpOnly JWT cookie; `src/lib/server/authenticated-backend.ts`
attaches the bearer and rotates on expiry, deduplicating concurrent refreshes so a page issuing six
queries at once does not rotate six times.

```
src/app/(public)/     landing, login, register
src/app/(app)/        terminal, journal, accounts, analytics — behind src/proxy.ts
src/app/api/          the BFF: one route file per backend resource
src/features/<slice>/ api.ts, schema.ts, types.ts, components/ — one folder per domain slice
src/components/ui/    shadcn + Base UI primitives
src/components/layout/ shell, rail, header, mobile nav
src/lib/              envelope, api-client, case, format, query-keys
src/lib/server/       "server-only" modules: backend fetch, auth options, proxies
src/test/             architecture + bundle guards
```

**No catch-all proxy.** `src/app/api/[...path]/route.ts` would forward any path a client invents,
including ones the UI has no business calling. Every resource is declared explicitly, and
`src/test/architecture.test.ts` fails the build if a `[...path]` route appears.

### Guards that run in CI

| Guard | Prevents |
|---|---|
| server modules out of `(app)` and `features` | a `server-only` import crashing a client component at runtime |
| `BACKEND_BASE_URL` referenced in exactly one file | the Go URL reaching the browser |
| no `NEXT_PUBLIC_BACKEND*` | the same leak through an env var |
| every `<form>` carries `method="post"` | a pre-hydration submit defaulting to GET and putting a password in the URL and access logs |
| no `[...path]` BFF route | an open proxy |
| bundle scan of `.next/static` after a real build | any of the above slipping through anyway |

The last one is the important one: it is fail-closed and runs against the actual compiled output.

---

## 2. Design system

Both themes come from the product design specs and live as tokens in `src/app/globals.css`.

**Terminal Precision (dark, default).** A dark-room instrument. Base `#0B0E14`, panels `#141822`,
controls `#1A202C`, seams `#1E2433`. Electric emerald `#00F0A8` for long/profit, coral `#FF4D6D`
for short/loss, cyan `#00D2FF` for playback, crosshairs and focus. Elevation is tonal layering plus
1px borders — blur turns a dense data matrix into mud.

**Institutional Precision Replay (light).** A daylight trading floor. White canvas, `#F8FAFC`
structural tier, `#F1F5F9` recessed controls, `#E2E8F0` hairlines. Emerald `#059669`, crimson
`#E11D48`, sky `#0284C7`.

Shared rules:

- **Semantic color only.** Green means profit or long — never "primary button". A component that
  hardcodes a hue is a component that lies in the other theme.
- **Tiles, not cards.** Panels are `0px` radius so adjacent tiles form a continuous hairline seam;
  controls are 2–4px. The `.pane` class carries this.
- **Two voices.** Inter for chrome, JetBrains Mono for every number. `.metric` turns on tabular
  figures and a slashed zero so a price column cannot jitter as it updates. `.label-caps` is the
  uppercase micro-label, never below 10px.
- **Density.** 22px dense rows so an order book shows 30+ rows without scrolling; 12px pane padding.

Theme selection uses `useSyncExternalStore` over `localStorage` rather than `useState` in an effect,
so there is no cascading render and another tab's change propagates.

---

## 3. Precision — the rule that matters most here

Prices, sizes, balances and R-multiples arrive as **strings** and stay strings the whole way
through the UI. ESLint bans `Number()` and `parseFloat` inside `src/features/**`, and flags
arithmetic on identifiers matching `amount|balance|equity|price|quantity|pnl|drawdown|leverage`.

`src/lib/format.ts` is the single, documented place a decimal becomes a number, and only ever for
display. Anything compared or computed uses `decimal.js`.

The reason is concrete: a stop loss that has been through a float is a stop loss the server and the
screen no longer agree about, and the disagreement surfaces as a fill the trader did not ask for.

---

## 4. Screen inventory

Desktop uses a persistent top bar plus a left rail (≥lg); mobile collapses to a bottom bar. The
terminal is full-bleed — it manages its own docking grid edge to edge.

| Screen | Route | Sprint | Backend it needs |
|---|---|---|---|
| Landing | `/` | 01 ✅ | — |
| Login / SSO | `/login` | 01 ✅ (SSO in 07) | `/auth/*` |
| Register | `/register` | 01 ✅ | `/auth/register` |
| Accounts & Resets | `/accounts` | 01 ✅ | `/accounts`, `/reset`, `/ledger`, `/verify` |
| Replay Terminal | `/terminal` | 03 | sessions, bars, websocket |
| Trade & Execution Slip (mobile) | `/terminal` sheet | 04 | orders, positions |
| Trade Journal & Reveal | `/journal` | 05 | journal, trades, reveal |
| Performance Analytics | `/analytics` | 06 | session + cross-session metrics |

Screens that are not built render an honest placeholder naming the sprint and what it is blocked on.
They do **not** render plausible-looking candles or balances: in a trading tool, mock data is
indistinguishable from real data until somebody acts on it.

---

## 5. Sprint plan

**Sprint 00–01 — shell, auth, accounts — DONE.**
BFF plumbing, envelope handling, snake ↔ camel conversion at the boundary, NextAuth with credentials
and Google, both themes, the app shell, and Accounts & Resets end to end: opening a portfolio,
resetting into a new iteration, and the integrity badge — which calls `/ledger/verify` and shows
what the recomputation actually returned, rather than reading a stored flag.

**Sprint 02 — feed selection.**
- Feed browser: alias, timeframe class, difficulty, bar count. Nothing else is rendered because
  nothing else is sent.
- "Randomize new starting point" flow.
- A guard test asserting no feed response field is ever surfaced that could identify the instrument.

**Sprint 03 — the Replay Terminal.** The largest slice.
- Chart canvas: candles, volume, EMA overlay, RSI sub-chart, `LOG`/`AUTO`/`%` scale controls.
  Rendered on `<canvas>` with an offscreen buffer — 60 FPS at 10x is not reachable through the DOM.
- Drawing suite: fib retracement and extension, supply/demand boxes, trendlines, horizontals.
- Transport: step back / play / step forward, 0.5x–10x, scrub, cursor readout.
- Websocket client: subscribe, resume from cursor on reconnect, backpressure by dropping frames
  rather than queueing them — a stale frame is worse than a skipped one.
- The cursor is **display state only**. The client renders what the server sent; it never derives
  a bar the server has not released.
- Mobile: single-pane workspace, bottom quick-action bar, swipeable sheets for the ladder.

**Sprint 04 — execution and the bracket dock.**
- Order ticket with mandatory stop, computed R:R, position sizing in lots or risk-%.
- Rule-compliance panel reflecting server-side gate results — including rejections, shown as
  rejections rather than silently corrected values.
- Open positions / pending orders / session trades table at 22px rows.
- Idempotency: a `client_key` per submit, reused on retry.
- Optimistic UI is deliberately **not** used for order placement. An order that appears to fill and
  then vanishes is worse than one that takes 80ms.

**Sprint 05 — journal and the mystery reveal.**
- Candle-by-candle trade log with behaviour tags and per-trade notes.
- The reveal: a deliberate, irreversible action with a confirmation that says so — the real ticker,
  timeframe, macro cycle, benchmark alpha, and the discipline breakdown.
- Post-mortem free-text with prompt chips.
- Execution footprint chart marking entries and exits with their R-multiples.

**Sprint 06 — performance analytics.**
- Cross-session KPIs, cumulative growth vs drawdown, R-multiple distribution, streak dispersion,
  rule adherence, session alpha by liquidity window, asset-class split (post-reveal only).
- CSV export.
- Charts follow the same semantic palette; no chart invents a hue.

**Sprint 07 — institutional access and polish.**
- TradingView SSO and SAML 2.0 / Okta buttons on the existing auth shell.
- Keyboard assist (`B` buy, `S` sell, `space` step) with a discoverable map.
- Accessibility pass: the color-blind case matters more than usual here, because long/short is
  encoded in color — direction gets a shape or a label everywhere, not just a hue.
- Performance budget enforced in CI.

---

## 6. Data fetching

- **TanStack Query** for everything server-derived. Keys in `src/lib/query-keys.ts`.
- Bar windows are keyed by cursor (`sessionBars(sessionId, cursor)`) so a stale window can never be
  served from cache after a step — that would be showing the trader the wrong bar.
- Mutations invalidate the narrowest key that covers the change.
- Server Components fetch the first paint where the data is not interactive; anything the websocket
  updates is a client component from the start.

## 7. Testing

- **Vitest** for pure logic: schemas, formatters, envelope handling, the architecture guards.
- **Testing Library** for components with real branching — gate rejection rendering, reset dialogs.
- **Playwright** for flows that cross the whole stack and cannot be faked: the reset tree (already
  covered), placing an order against the gate, and the reveal. These bring up Postgres, Redis and
  both servers.
- **`pnpm verify`** runs type generation from the backend's swagger, lint, typecheck, unit tests,
  and the bundle guard — the same order CI uses.

## 8. Risks

| Risk | Mitigation |
|---|---|
| 60 FPS at 10x is the hardest requirement in the product | Canvas + offscreen buffer from the start; server sends pre-decoded frames; measure in Sprint 03 rather than discovering it in Sprint 06 |
| Websocket reconnection losing cursor position | Server owns the cursor; the client resumes by asking, never by remembering |
| A single leaked field destroys the blinding premise | The backend never sends the identity pre-reveal, and a response-shape test guards each endpoint. Both layers, because either alone is one refactor from failing |
| Chart library choice | Evaluate in Sprint 02 against the drawing suite and 10x playback, before the terminal is built on top of it |
