# Sprint 07 — Institutional access and polish (frontend)

**Status:** PLANNED · **Estimate:** 6–8 dev-days
**Requirements:** FR-AUTH-05..08, FR-UI-07, NFR-04
**PRD:** §3.6, §6.4
**Consumes:** backend Sprint 07

## Goal

Open the front door to prop desks and academies, and close out the accessibility and performance
work that the earlier sprints deliberately left until the screens existed.

## Tasks

### 07.1 SSO (FR-AUTH-05..07)
- TradingView SSO as the primary button on the existing auth shell, then Google, GitHub, Apple.
- Enterprise entry: an email-domain check that routes a known tenant to their Okta/SAML flow, with
  a separate "Sign in with SSO" path for desks.
- Every provider lands on the same session shape, so nothing downstream branches per provider.
- Error copy per failure mode that does not distinguish *why* an SSO assertion failed — that
  distinction is an oracle for forging one.

### 07.2 Sandbox mode (FR-AUTH-08, DEFERRED)
UI is straightforward; the blocker is backend abuse control. Kept in the register so it is a
decision rather than an omission.

### 07.3 Accessibility
- **Direction is never encoded by color alone.** Long/short and profit/loss carry a shape, glyph or
  label as well. This matters more here than in most products: red/green is the primary signal on
  every screen, and roughly 1 in 12 men has a red-green deficiency.
- Keyboard reachability for every trading action, focus visible against both themes, and focus
  order that follows the docking layout rather than the DOM accident.
- Screen-reader labels for chart summaries: a text alternative stating the session's state, since a
  canvas is opaque to assistive technology.
- Contrast audit of both themes against WCAG AA, including the dense 10–11px `.metric` type.

### 07.4 Performance budget
Bundle-size and Lighthouse budgets enforced in CI, with the terminal route measured separately —
it is the heaviest route and the one that matters most.

### 07.5 PWA (NFR-04)
Manifest, installability, offline shell for the marketing and auth routes. The terminal is not
offline-capable and should say so rather than failing obscurely.

## Acceptance criteria

| # | Given | When | Then |
|---|---|---|---|
| 07-AC-1 | A TradingView account | SSO sign-in | Lands in the app with a session identical to a password sign-in |
| 07-AC-2 | An enterprise email domain | Entered at login | Routed to that tenant's SAML flow |
| 07-AC-3 | Any SSO failure | Triggered | One generic message; no cause distinction |
| 07-AC-4 | Simulated red-green deficiency | Every screen | Direction remains readable without hue |
| 07-AC-5 | Keyboard only | Full session traded | Every action reachable; focus always visible |
| 07-AC-6 | Terminal route | CI | Within the bundle and Lighthouse budget |
| 07-AC-7 | Mobile browser | Installed as PWA | Launches; the terminal states its online requirement |

## Definition of done
All criteria met, the accessibility audit recorded, and budgets enforced in CI.
