# BlindPulse Replay Lab — frontend

Next.js 16 BFF and UI for BlindPulse Replay Lab. Browser code only ever calls same-origin `/api/*`
routes; the Go service URL and the access/refresh tokens stay server-only. NextAuth keeps the
tokens in its encrypted, httpOnly JWT cookie and rotates access through the Go service.

Same architecture as `tripmate-fe`: App Router, a per-resource BFF (never a catch-all proxy),
TanStack Query on the client, shadcn/Base UI components, and Vitest guards that fail the build if
a server module or the backend URL leaks into the client bundle.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
curl http://localhost:3000/api/health
```

The backend must be running on the `BACKEND_BASE_URL` configured in `.env.local`. Set a unique,
high-entropy `NEXTAUTH_SECRET` outside local development. Route protection lives in `src/proxy.ts`.

## Commands

- `pnpm dev` — local development server
- `pnpm test` — Vitest contract and architecture guards
- `pnpm test:bundle` — production build followed by the fail-closed client bundle leak guard
- `pnpm test:e2e` — Playwright flows (manages local Postgres, Redis, and both dev servers)
- `pnpm lint` / `pnpm typecheck` / `pnpm build`
- `pnpm verify` — everything above, in the order CI runs it

## Design system

Two themes, both taken from the product design specs, defined as tokens in `src/app/globals.css`:

- **Terminal Precision** (dark, the default) — a dark-room instrument. Electric emerald `#00F0A8`
  for long/profit, coral `#FF4D6D` for short/loss, cyan `#00D2FF` for playback and focus. Elevation
  comes from tonal layering and 1px seams, never blur.
- **Institutional Precision Replay** (light) — a daylight trading floor. Emerald `#059669`,
  crimson `#E11D48`, sky `#0284C7`, hairline `#E2E8F0` dividers.

Both are dense, low-radius and edge-to-edge: panels are tiles in a docking grid, not cards on a
page. Semantic color is bound to financial state only — nothing is green for decoration.

Two typefaces, loaded once in the root layout: **Inter** for UI chrome and **JetBrains Mono** for
every quantitative surface. The `.metric` class enables tabular figures and a slashed zero so a
price column cannot jitter as it updates; `.label-caps` is the uppercase micro-label.

## Money and precision

Prices, sizes, balances and R-multiples cross the wire as **strings** and stay strings the whole
way through the UI. `Number()` and `parseFloat` are banned by ESLint inside `src/features/**` —
a stop loss that has been through a float is a stop loss the server and the screen no longer agree
on. `src/lib/format.ts` is the single, documented place where a decimal becomes a number, and only
ever for display.

## Status

Implemented: authentication (email/password and Google), the app shell with both themes, and
Accounts &amp; Resets end to end — opening a replay portfolio, resetting it into a new iteration, and
live verification of the ledger's hash chain.

The Replay Terminal renders its docking layout in a resting state and says so; it does not show
invented candles or balances. Trade Journal and Performance Analytics name the sprint that builds
them.

## Requirements

`docs/requirements/` holds the specification this app is measured against — the approved PRD, a
register giving every requirement a stable ID traced to its PRD section and owning sprint, and one
document per sprint with tasks, acceptance criteria, tests and risks. Start at
[`docs/requirements/README.md`](docs/requirements/README.md).

`PLAN.md` is the shorter architectural companion to that folder.
