# Sprints 00–01 — Foundation, identity and accounts (frontend)

**Status:** DONE
**Requirements:** FR-AUTH-01..04, FR-ACCT-01..05, FR-UI-01/02/05/07, NFR-08
**PRD:** §3.5, §3.6, §5
**Consumes:** backend Sprints 00–01

## Goal

Stand up the BFF, implement both design systems as real tokens rather than a mood board, and ship
one complete vertical slice — Accounts &amp; Resets — so the seam between the two repos is proven by
a working feature rather than by a schema.

## Scope delivered

### 00.1 BFF architecture
- Browser code calls only same-origin `/api/*`. The Go service URL and the token pair never leave
  the server.
- NextAuth holds access and refresh in its encrypted, httpOnly JWT cookie;
  `src/lib/server/authenticated-backend.ts` attaches the bearer and rotates on expiry,
  **deduplicating concurrent refreshes** so a page issuing six queries at once rotates once.
- One route file per backend resource. A `[...path]` catch-all would forward any path a client
  invents, so `src/test/architecture.test.ts` fails the build if one appears.
- Envelope handling and snake ↔ camel conversion at the boundary only.

### 00.2 Guards that run in CI
| Guard | Prevents |
|---|---|
| server modules out of `(app)` and `features` | a `server-only` import crashing a client component at runtime |
| `BACKEND_BASE_URL` in exactly one file | the Go URL reaching the browser |
| no `NEXT_PUBLIC_BACKEND*` | the same leak via env var |
| every `<form>` has `method="post"` | a pre-hydration submit defaulting to GET, putting a password in the URL and access logs |
| no `[...path]` route | an open proxy |
| bundle scan of `.next/static` after a real build | all of the above slipping through anyway |

The last is fail-closed and runs against compiled output, which is the only one that cannot be
argued with.

### 00.3 Design systems (FR-UI-01, FR-UI-02)
Both PRD §5 themes as CSS custom properties in `src/app/globals.css`:
- **Terminal Precision** (dark, default): base `#0B0E14`, panels `#141822`, controls `#1A202C`,
  seams `#1E2433`; bullish `#00F0A8`, bearish `#FF4D6D`, telemetry `#00D2FF`.
- **Institutional Precision Replay** (light): white canvas, `#F8FAFC` / `#F1F5F9` tiers,
  `#E2E8F0` / `#CBD5E1` borders; bullish `#059669`, bearish `#E11D48`, accent `#0284C7`.

Rules encoded, not just described:
- Semantic color only — `--bullish` means profit or long, never "primary button". A component that
  hardcodes a hue lies in the other theme.
- Tiles, not cards: `.pane` is 0px radius so adjacent panels form one continuous hairline seam.
- `.metric` enables tabular figures and a slashed zero, so a price column cannot jitter as it
  updates. `.label-caps` is the uppercase micro-label, never below 10px.
- Theme selection via `useSyncExternalStore` over `localStorage` — no setState-in-effect, and
  another tab's change propagates.

### 00.4 Decimal precision (NFR-08)
Prices, sizes, balances and R-multiples arrive as strings and stay strings. ESLint bans `Number()`
and `parseFloat` inside `src/features/**` and flags arithmetic on money-shaped identifiers.
`src/lib/format.ts` is the single documented place a decimal becomes a number, for display only.

### 00.5 Auth and accounts (FR-AUTH-01..04, FR-ACCT-01..05)
- Login, register, Google sign-in, session-expiry handling.
- Accounts &amp; Resets: tree list, open-portfolio dialog with the risk policy pre-filled to the
  server's defaults, reset dialog stating plainly that the old iteration is *preserved*.
- The integrity badge calls `/ledger/verify` and shows what the recomputation returned. It does not
  read a stored flag — a badge that always says VERIFIED because a column says so is decoration.

## Acceptance criteria — all met

| # | Criterion | Verified by |
|---|---|---|
| 01-AC-1 | No compiled client asset contains `BACKEND_BASE_URL` or a backend origin | `test:bundle` against a real build |
| 01-AC-2 | An unauthenticated `/api/accounts` returns `UNAUTHENTICATED`, not a proxy error | Live smoke |
| 01-AC-3 | A protected route redirects to `/login?next=…` | Live: 307 with the encoded path |
| 01-AC-4 | Register → open portfolio → reset renders both iterations with the older one intact | Playwright `account-reset-tree.spec.ts` + live browser run |
| 01-AC-5 | Both themes render every semantic state without a hardcoded hue | Token review; no literal colors in feature components |
| 01-AC-6 | `pnpm verify` green: lint, typecheck, 47 tests, build, bundle guard | CI |

## Known gaps carried forward
- The Replay Terminal renders its docking layout in a resting state and names the sprint that
  brings the engine. It shows no candles or balances: mock data in a trading tool is
  indistinguishable from real data until somebody acts on it.
- Trade Journal and Performance Analytics do the same.
