# RecallMap: Known Issues

Last updated 2026-11-04. "Confirmed" = observed in source or by a command I ran; "Potential" = needs verification.

| ID | Type | Issue | Status | Evidence | Proposed resolution |
|---|---|---|---|---|---|
| KI-01 | Bug (tooling) | `npm run lint` cannot start: config imports `eslint/config` but ESLint 8.57.1 is installed | Confirmed | ER-001 BL-04 | DR-01(b): ESLint 9 + matching `eslint-config-next` |
| KI-02 | Security | `next@16.3.8` is inside the affected range of two critical RCE advisories and one high DoS advisory; the flagged code paths (image optimizer with SVG, `use cache`, Server Actions) do not appear to be used in this repository | Confirmed (installed version, advisories) / exposure of a deployed instance **not verified** | ER-001 BL-06 | DR-01(a): upgrade to a patched Next |
| KI-03 | Build | `next build` fetches Google Fonts at build time; fails without network | Confirmed in sandbox (inconclusive about real hosts) | ER-001 BL-05 | self-host fonts (DR-01(c)) |
| KI-04 | Docs | HANDOFF/MILESTONE_STATUS claim 109 tests in 11 files; actual 116 in 12; palette and font descriptions disagree with the code (brand `#0866ff`, Manrope/Source Sans 3/JetBrains Mono) | Confirmed | tests run; `app/globals.css`, `app/layout.tsx` | reconcile in B0 |
| KI-05 | Repo | `.env.example` is not tracked (`.gitignore` has `.env*`) | Confirmed | `git ls-files` | fix pattern (DR-01(f)) |
| KI-06 | Repo | `recallmap.zip` (about 570 KB) committed inside the repository; CRLF line endings in some copies | Confirmed | `git ls-files`, diff | DR-01(d),(e) |
| KI-07 | Security | No route protection: `/dashboard/*` reachable unauthenticated; sign-in only redirects | Confirmed | no middleware/proxy; `SignInScreen.tsx` | B2 |
| KI-08 | Functional | Map layout hardcoded per concept id; unknown ids stack at the centre | Confirmed | `KnowledgeGraph.tsx`, `demo-data.ts` | B4 layout functions |
| KI-09 | Architecture | Two parallel data paths (demo constants vs `LearnerData`/`isDemo`) | Confirmed | `knowledge.ts` | `DataSource` interface, B3 |
| KI-10 | Functional | Tutor canned for 5 of 13 demo concepts; free-text ignored; practice has 3 questions and results are not recorded | Confirmed | `demo-tutor.ts`, `StudyWorkspace.tsx` | B5 |
| KI-11 | Functional | PDF upload discards the file; pasted text kept in memory only | Confirmed | `library-store.tsx` | B3 |
| KI-12 | UI | `reset-password/page.tsx` uses hardcoded legacy colours | Confirmed | source | page leaves launch scope (DR-11) |
| KI-13 | Accessibility | Drawer has no focus trap; inline `onClose` may re-run its focus effect on parent re-render; tab semantics incomplete | Confirmed (no trap) / Potential (focus bounce) | `components/recallmap/shared.tsx` | B8 audit and fixes |
| KI-14 | Dependencies | Unused: `recharts`, `react-hook-form`, `@hookform/resolvers`, `@google/genai`, `shadcn` (CLI); `framer-motion`/`react-icons` only in unused components; non-standard npm `cn` package used by `lib/utils.ts` | Confirmed by import search; **removal not yet done or re-verified** | grep | DR-01(g) after re-verification |
| KI-15 | Config | `next.config.ts` has `/sw.js` header rules but no service worker exists | Confirmed | source | remove in B0 |
| KI-16 | Provenance | Sidebar photos have unknown source and licence | Potential | `public/sidebar-images/` | confirm rights or replace |
| KI-17 | Responsive/a11y | Never checked in a browser or on devices | Not executed | MILESTONE_STATUS.md | B8 |
