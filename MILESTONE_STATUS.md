# Milestone 5 — My Progress, Learning History, Preferences

## Implemented
- **My Progress** (`components/recallmap/ProgressView.tsx`, `lib/recallmap/progress.ts`): per-subject stacked state bar (hatched = not yet assessed) with counts; topic > concept rows with state, "x of y questions correct across n attempts" and a Measured / Estimated / No data chip; full list of scored assessment results with question counts; "Change over time" (first vs latest attempt, only for concepts assessed >=2 times, single-attempt concepts counted separately); "Previously weak, now improved" (with "improved is not mastered" caveat); "Still uncertain or needs assessment" with reasons (not assessed / limited evidence / unconfirmed inference) and a "Take a check" link; retention section with completed checks and recommended (not done) checks and a note that no due dates exist. No composite score. Empty state when there is no evidence (including after "Remove demonstration data").
- **Learning History** (`HistoryView.tsx`, `history.ts`): "Recommended next (not done yet)" (dashed cards, "Recommended, not done") kept separate from "Completed activity". Five activity types: study session, assessment, follow-up assessment, retention check, practice. Filters: subject, type, status, with live "Showing x of y", Clear filters, and a no-match empty state. Expandable detail (aria-expanded/controls, labelled region): summary, concepts (linked to the map), explanation tried, scored results with previous attempt, a caution that changes may have other causes, "why suggested" for recommendations, and a Start/Study link. Global empty state with no data.
- **Preferences** (`PreferencesView.tsx`, `preferences.ts`, `preferences-store.tsx`): explanation style (steps / examples / analogies / visual, multi-select; visual flagged "Not available yet"), depth (brief/standard/detailed), pace (slow/normal/fast), preferred difficulty (gentle/standard/challenging), optional goals (300 chars). Native radios/checkboxes in fieldsets, Save (disabled until changed) / Discard / Reset, live status messages, a labelled canned-text sample that follows unsaved selections, and a "Where these are used today" list. Honest notice: stored in this browser's localStorage only, not synced, demo tutor does not adapt yet. Handles blocked/corrupt storage.
- **Integration:** `PreferencesProvider` mounted in `DashLayout`; Study Sessions highlights quick actions matching saved style (`data-preferred`) and passes `preferences` in `TutorRequest` (demo tutor ignores it). New types in `types.ts`; illustrative data in `demo-history.ts` consistent with existing `DEMO_LEARNER_STATES`.
- Docs: `docs/API_CONTRACTS.md` gained `explanationDepth`, `GET /api/progress`, expanded `GET /api/history`; `docs/ARCHITECTURE.md` status updated; stale template-auth note removed from HANDOFF.

## Real integrations vs demo
Unchanged: everything is local demo data in React state (resets on reload). No backend, database, auth, storage or AI call. Only Preferences persists, and only to this browser's localStorage. Demo attempts/activities are an **illustrative log with ordinal order, not real learner results and not calendar-dated**.

## Verified (run in this session, in a Linux container)
- Baseline before changes: `npx tsc --noEmit` clean; 7 files / 46 tests pass (matches the Milestone 4 report).
- After changes: `npx tsc --noEmit`: **pass**. `npx vitest run`: **pass, 11 files, 109 tests** (63 new: `progress.test.ts`, `history.test.ts`, `preferences.test.tsx`, `progress-history-views.test.tsx`). Covers progress calculations, trend/improvement thresholds and ordering, uncertainty reasons, recommendation rules, missing/empty evidence, history ordering and filtering, preference toggles/save/discard/reset/restore/corrupt storage, preview depth, Study Sessions highlight, absence of XP/streak text, empty states, focus retention on expand.
- `npx next build`: **pass** (all 12 routes static).
- Built app started with **no env files**: `/`, `/dashboard`, `/dashboard/library`, `/dashboard/sessions?material=m1&concept=conditions`, `/dashboard/map`, `/dashboard/gaps`, `/dashboard/progress`, `/dashboard/history`, `/dashboard/preferences` all return HTTP 200; server-rendered HTML contains the expected labels.
- Regression: all 46 pre-existing tests (library, Study workspace, Knowledge Map, Knowledge Gaps, tutor, foundation) still pass unchanged. Auth dependency scan found no auth SDK package in the manifests or lockfile. Secret scan of packaged files: none.

## NOT verified
- **No real-browser rendering.** No browser was available. Responsive layout (stacked bars, two-column grids, filter row wrap, sticky save bar on mobile), touch behaviour, colour contrast and screen-reader behaviour were reviewed only by reading markup/classes and by jsdom tests. Do not treat M5 pages as visually QA'd.
- `npm run lint` is still broken by the template ESLint config (eslint 8 / eslint-config-next 14 vs Next 16); not run, not fixed.
- Sticky save bar behaviour inside the scrolling `<main>` and `localStorage` across real reloads were not checked in a browser (store logic is unit-tested).

## Known limitations
- Without real timestamps there are no dates, due dates or spacing intervals; "retention" has no time dimension yet. Needs backend timestamps.
- `knowledge.ts` (M4 map/gaps/dashboard) still reads `DEMO_*` directly while M5 modules take a `LearnerData` argument; unify when the API exists.
- Recommended activities are derived on the client; no scheduling/"planned" status exists yet (type allows only completed/recommended).
- "Visual explanations" preference is stored but nothing consumes it. Depth/pace/difficulty/goals are stored but unused until the real tutor.
- `MilestoneNote` in `shared.tsx` is now unused. `/onboarding` is still a placeholder. Zoom/pan resets when switching map subjects (M4).

## Next milestone (6): onboarding, sign-in UI polish, browser QA
See HANDOFF.md "Next steps". Then the backend stage.
