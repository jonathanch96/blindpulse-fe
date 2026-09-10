# BlindPulse Replay Lab — frontend requirements

Everything the frontend owes, traced from the approved PRD down to a sprint task and an acceptance
criterion. Nothing here is a summary of the code; it is the specification the code is measured
against.

## How to read this folder

| File | What it is | When you read it |
|---|---|---|
| [`PRD.md`](PRD.md) | The approved PRD v1.0.0, verbatim | The source of truth for *what* and *why*. Mirrored from the BE repo — edit both together |
| [`requirements-register.md`](requirements-register.md) | Every requirement with a stable ID, its PRD section, owner and sprint | To find which sprint owns a requirement, or to check nothing was dropped |
| `sprint-NN-*.md` | One sprint: tasks, acceptance criteria, tests, risks | When you pick up the sprint |

Sprint documents cite register IDs (`FR-TA-03`) and PRD sections (`PRD §3.2`). If you are about to
build something that has neither, it is not agreed work — add it to the register first.

## Sprints

| Sprint | Theme | Status | Doc |
|---|---|---|---|
| 00–01 | Foundation, identity and accounts | **DONE** | [sprint-00-01-foundation-accounts.md](sprint-00-01-foundation-accounts.md) |
| 02 | Feed selection | Planned | [sprint-02-feed-selection.md](sprint-02-feed-selection.md) |
| 03 | Replay Terminal | Planned | [sprint-03-replay-terminal.md](sprint-03-replay-terminal.md) |
| 04 | Execution dock | Planned | [sprint-04-execution-dock.md](sprint-04-execution-dock.md) |
| 05 | Trade Journal and reveal | Planned | [sprint-05-journal-reveal.md](sprint-05-journal-reveal.md) |
| 06 | Performance Analytics | Planned | [sprint-06-analytics.md](sprint-06-analytics.md) |
| 07 | Institutional access and polish | Planned | [sprint-07-institutional-access.md](sprint-07-institutional-access.md) |

Sprint numbers are shared with `blindpulse-be`: frontend sprint *n* consumes backend sprint *n*.
Each doc here names the backend contract it needs.

## Three rules this UI is built on

**1. The UI shows the rules; the server applies them.** The compliance panel, the required stop
field and the disabled reveal button all mirror server-side rules. None of them is the enforcement.
A rule only the browser applies is a rule a `curl` command ignores.

**2. Decimals stay strings.** Prices, sizes, balances and R-multiples never become JS numbers
except in `src/lib/format.ts`, for display. ESLint enforces it. A stop loss that has been through a
float is a stop loss the server and the screen no longer agree about.

**3. No invented data.** A screen that is not built says which sprint builds it. It does not render
plausible candles or balances, because in a trading tool mock data is indistinguishable from real
data until somebody acts on it.

## Screen inventory (PRD §4)

| Screen | Route | Sprint | Status |
|---|---|---|---|
| Landing | `/` | 01 | **DONE** |
| Login &amp; SSO | `/login` | 01 / 07 | Password + Google done; SSO in 07 |
| Accounts &amp; Resets | `/accounts` | 01 / 06 | Tree and ledger done; overlay and forking in 06 |
| Replay Terminal | `/terminal` | 03 | Layout shell only |
| Mobile Terminal | `/terminal` @390px | 03 | Planned |
| Execution slip (mobile) | `/terminal` sheet | 04 | Planned |
| Trade Journal &amp; Reveal | `/journal` | 05 | Placeholder |
| Performance Analytics | `/analytics` | 06 | Placeholder |

Both themes (PRD §5) are implemented as tokens already, so every screen above is built once and
renders correctly in each.

## The hard part

Sprint 03 carries NFR-02 — 60 FPS at 10x with overlays — and the charting decision that makes it
reachable or not. That decision is made and measured in the first two days of the sprint, before
anything is built on top of it, and recorded as an ADR. Discovering it in Sprint 06 would mean
rewriting the terminal.

## Reviews

Post-sprint reviews live in the **backend** repository under
[`docs/reviews/`](https://github.com/jonathanch96/blindpulse-be/tree/main/docs/reviews), because the
product-level sprint plans do. They cover both repositories: frontend findings carry an `FE-` prefix.
