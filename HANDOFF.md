# HANDOFF — RecallMap

Snapshot: **Milestone 5 complete** (My Progress, Learning History, Preferences). Describes the code in this ZIP, not an aspiration.

## Purpose
RecallMap is a personalized adaptive learning app. Tagline: "Understand more. Remember what matters." Each subject has its own knowledge map; the tutor lives inside Study Sessions (no global chat page). Understanding states: demonstrated, partial, suspected gap, not yet assessed (unassessed is missing data, NOT a failure). An observed wrong answer is distinct from an inferred misconception, which is always shown as unconfirmed. Progress means demonstrated understanding from scored questions, never time spent.

## Status
Milestones 1-5 of ~6 complete: foundation; dashboard + library; study sessions; knowledge map + gaps; **progress + history + preferences**. See `MILESTONE_STATUS.md` for verified results and known issues.
Remaining UI: **Milestone 6** = onboarding (`/onboarding` is a placeholder) + Google sign-in UI polish + responsive/accessibility pass in a real browser. After that, the separate **backend stage** (auth, Postgres, storage, Gemini).

## Backend architecture (read this)
Intended: Next.js route handlers as the API, PostgreSQL (Aiven) with pgvector, Cloudflare R2 behind a configurable storage interface (S3-compatible), Google OAuth (Auth.js recommended), Gemini server-side with `GEMINI_API_KEY_PRIMARY` first and `GEMINI_API_KEY_SECONDARY` only as a controlled fallback for recoverable quota/rate/availability errors, and a separately configured embedding model. Full details: `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md`.
**Currently implemented: none of the backend.** All learner data is local demo data in React state and resets on reload. The single exception is Preferences, which writes to this browser's `localStorage` (not a server). Supabase is fully removed (no code, packages or env vars; only docs mention its removal). Do not reintroduce it.

## Stack
Next.js 16 (App Router; read `node_modules/next/dist/docs/` before using unfamiliar APIs, see AGENTS.md), React 19, Tailwind 4, shadcn/base-ui, lucide-react, vitest + Testing Library. No Supabase. Palette: ink `#163300`, accent `#9fe870`, surface `#fafbf9`, border `#e2e6de`. Font: Outfit (`font-outfit`).

## Run (Windows PowerShell)
```powershell
# unzip, then:
cd recallmap
npm install                      # or: npm ci  (uses package-lock.json)
# No env file is needed to run the UI today. For later backend work only:
Copy-Item .env.example .env.local   # then edit; .env.local is git-ignored and never packaged
npm run dev                      # http://localhost:3000
npx tsc --noEmit                 # typecheck
npm test                         # vitest run (109 tests)
npm run build                    # production build
npm run start                    # serve the build
```
`npm run lint` is broken by the template's ESLint config (eslint 8 + eslint-config-next 14 vs Next 16); not fixed.

## Key files
- `lib/recallmap/types.ts` — domain model (concept graph, learner state, evidence, **AssessmentAttempt, LearningActivity, LearnerData, LearnerPreferences**).
- `lib/recallmap/demo-data.ts` — concept graphs + learner states (Programming 7 concepts, Mathematics 6). `demo-history.ts` — **illustrative attempt log + completed activities** and `EMPTY_LEARNER_DATA`. All demo data is labelled in the UI.
- `lib/recallmap/knowledge.ts` — read helpers over the concept graph (M4, still reads DEMO data directly).
- `lib/recallmap/progress.ts` — **pure functions over a `LearnerData` argument**: subject/topic/concept progress, trends (first vs latest attempt by sequence), improved concepts, uncertainty reasons, retention checks, `recommendedActivities` (derived, never stored). Thresholds are exported constants.
- `lib/recallmap/history.ts` — activity labels, `allActivities` (completed newest-first then recommended), `filterHistory`, `priorAttempt`.
- `lib/recallmap/preferences.ts` — option lists, defaults, payload builder (`toApiPayload`), validation of stored JSON, style→tutor-mode map, sample preview. `preferences-store.tsx` — `PreferencesProvider`/`usePreferences` (localStorage key `recallmap.preferences.v1`, default context works with no provider).
- `lib/recallmap/library-store.tsx` — in-memory subjects/materials; `isDemo` + `clearDemo` gate ALL demo data (Progress/History/Gaps/Dashboard go empty when demo data is removed).
- `components/recallmap/{ProgressView,HistoryView,PreferencesView}.tsx` — the three M5 pages (`app/dashboard/{progress,history,preferences}/page.tsx` just render them).
- `components/recallmap/{MapView,KnowledgeGraph,ConceptDetails,GapsView,StudyWorkspace,SessionsView,shared}.tsx`, `lib/recallmap/{tutor,demo-tutor,state,nav}.ts` — earlier milestones.
- `components/dashboard/DashLayout.tsx` — mounts `PreferencesProvider` > `LibraryProvider`.
- Tests: `tests/*.test.ts(x)`; DOM tests need `// @vitest-environment jsdom` (default env is node).

## How M5 behaves (design decisions to keep)
- **No invented time.** Demo evidence has no calendar dates. Attempts/activities carry an ordinal `sequence`; trends compare order only; the UI says "demo step N" and states that no real dates exist. No due dates are shown for reviews. Real timestamps need the backend.
- **Measured / Estimated / No data** chips separate counted answers, unconfirmed inferences/recorded states with no scored attempt, and missing data. No composite score is computed (unassessed concepts would distort it).
- Trend needs >=2 scored attempts on one concept. "Previously weak, now improved" = first attempt < 50% and latest >= 10 points higher; the UI says improved is not mastered. Few questions (<3 total) = "limited evidence".
- Recommendations are derived from evidence (gap/partial -> reassess; demonstrated with no retention check -> retention check; unassessed with all prerequisites demonstrated -> first check). They live in a separate "Recommended, not done" section with dashed styling and are never mixed into completed history.
- Preferences: explicit Save/Discard/Reset; saved to localStorage only and labelled so. "Visual explanations" is selectable but flagged "Not available yet". Only explanation style has any effect today (highlights matching quick actions in Study Sessions and is attached to `askTutor` requests as `preferences`, which the demo tutor ignores). Depth/pace/difficulty/goals are stored only.
- No XP, points, streaks or leaderboards anywhere (a test asserts this on Progress).

## Constraints
- Reuse existing UI foundations; no big rewrites; no unnecessary dependencies.
- Label all demo data (`DemoBadge`). Never fake a Gemini response as real, never pretend auth succeeded or settings are server-saved.
- Keep concept graph (learner-independent) separate from learner evidence.
- Gemini later: server-side only; model from env (`GEMINI_MODEL`); no retry loops; verify current model and free-tier limits at implementation time.
- No billing, leaderboards, community, educator/admin features. Never put real secrets in ZIPs; `.env`/`.env.local` are excluded.

## Next steps
1. **Milestone 6 (UI):** onboarding flow at `/onboarding` that reuses the preferences model (goals, style, pace, difficulty; all optional; local-only until the backend), Google sign-in screen polish (UI-only), then a real-browser pass (mobile layouts of the three M5 pages, Knowledge Map touch pan/zoom, keyboard/screen-reader checks). Optionally remove the now-unused `MilestoneNote` from `shared.tsx`.
2. **Backend stage** (new session, separate milestones): Auth.js Google OAuth + `GET /api/me`; Postgres schema (users, learner_preferences, subjects, materials, concepts, concept_prerequisites, learner_concept_states, evidence, assessment_attempts, activities); swap `knowledge.ts`/`progress.ts` inputs, the history list and `PreferencesProvider.save` for the endpoints in `docs/API_CONTRACTS.md`; R2 storage; Gemini tutor + document processing with primary/secondary key fallback; embeddings + pgvector.

## Milestone 6 — UI polish (what changed)
- Visual system: Inter replaces Outfit/Roboto Flex/DM Sans imports; warmer surfaces (`#f7f7f5`), softer borders, subtle card shadows, focus rings, reduced-motion support. Sidebar active state is now a white raised item with a per-page icon color (`lib/recallmap/nav.ts`).
- Accent colors identify SUBJECTS only (`lib/recallmap/accent.ts`). Understanding states keep their own green/amber/red/hatched-grey (`state.ts`).
- Dashboard: next-step hero (derived from `recommendedActivities`), snapshot strip (concepts assessed, suspected gaps, scored questions, retention checks), per-subject state bars, top gaps, recent completed activity, and a link to Progress. The old map preview was removed from the dashboard (Knowledge Map page is unchanged).
- Progress: summary strip, selectable subject cards (`?subject=` deep link), expandable concept rows (attempts, evidence, prerequisites, actions), timeline of scored attempts, before/after bars for change over time. No mastery %, retention scores or dates are computed or invented.
- Shared: `SegBar` and `AccuracyBar` in `components/recallmap/shared.tsx`.
- Demo vs real: all learner data is still demonstration data, labelled as such; with demo cleared the dashboard and Progress show honest empty states. Nothing is persisted.
- Remaining: other pages (library, map, gaps, history, sessions, preferences) only inherit the new fonts/surfaces/borders; no per-page redesign. Build, tsc and the existing 109 tests pass.

## UI cleanup pass
- No em dashes in user-facing text; copy shortened across pages.
- Type scale raised slightly (`--text-xs` 13px, `--text-sm` 15px in `globals.css`; tiny arbitrary sizes bumped).
- Shared `Drawer` (`components/recallmap/shared.tsx`): animated, Esc/backdrop/close button, focus returns to trigger, bottom sheet on mobile.
- My Progress: clickable stat cards, concept tiles, attempt bar chart, all with drawers. Learning History: card grid with drawer details. Knowledge Gaps: card grid with drawer. Sessions, Library, Map, Preferences: text trimmed only.
- Still demo data only; history cards show "Demo step n" because no real dates exist.

## Modern blue redesign
- Palette: navy `#0f2347` (primary actions, selected states), ink `#0c1830` text, blue accent `#2a56c6`, blue-tinted neutrals (`#f4f6fa` page, `#dce3ef` borders). Semantic state colors (green/amber/red) are unchanged. No gradients (the sign-in gradient was removed; the hatched "not assessed" pattern is kept as a data cue).
- Shapes: base radius 8px; cards 11px, tiles/inputs 8px, buttons and chips 6px; pills only for dots.
- Navy sidebar with active indicator; per-route fade-in; press/hover feedback in `globals.css`; reduced-motion respected.
- Knowledge Map nodes are rounded squares with hover scale and animated selection ring. Study tutor replies are labelled and color-edged by type (explanation, steps, example, analogy); reading text is larger.
