# RecallMap: Current Status

Last updated 2026-11-07.

## Where we are
- **B0** complete (2026-11-04). **B1a** (backend foundation on local infrastructure) **implemented and verified locally** (2026-11-07). **B1b** (real Aiven/Render/R2/Gemini checks) has not started and needs the owner's actions. B2 onward not started.
- The commit hash and ZIP name for each delivery are in the delivery log below and in `MANIFEST.txt` inside every ZIP. The manifest also states **file counts precisely** (tracked files, the manifest itself, total files, directory entries, total archive entries) after the owner noted that ZIP 2-era wording was ambiguous: the earlier ZIPs held 144 tracked files **plus** `MANIFEST.txt` = **145 files** (186 archive entries including directories); my earlier "144" counted tracked files only.

## B1a handoff
**Implemented (files):** see `docs/architecture/SYSTEM_ARCHITECTURE.md` section 10 for the code map. Created: `src/contracts/*`, `src/server/**`, `app/api/v1/health/route.ts`, `instrumentation.ts`, `worker/index.ts`, `drizzle/`, `drizzle.config.ts`, `scripts/{migrate.ts,verify-infra.ts,check-cycles.mjs}`, `tests/server/**`, `vitest.db.config.mts`, `.nvmrc`, `.env.example` (rewritten), `docker-compose.yml`, `docker/postgres/init.sql`, `docs/deployment/ci.yml.example` (the CI workflow; **not active**). Modified: `package.json`/lockfile, `eslint.config.mjs`, `vitest.config.mts`, `next.config.ts`, `.gitignore`, documentation. The existing frontend (`app/` pages, `components/`, `lib/recallmap`) was not changed.

**Architecture decisions implemented:** Next.js API as a thin transport over framework-free services; separate worker process option with an embedded development mode (started once per process, bounded drain); repositories require a `UserContext` (no unscoped user-data query); Zod everywhere at boundaries; direct database connection for pg-boss, budgeted pools; provider-neutral AI gateway with the DR-18 data-mode guard; opaque hashed sessions; ESLint-enforced module boundaries and a cycle check.

**Database schema introduced:** `users`, `auth_identities`, `sessions`, `oauth_states`, `app_preferences`, `learning_preferences`, `worker_heartbeats` (migration `0000_identity_foundation`). No extensions. Details in `docs/architecture/DATABASE_SCHEMA.md` section 9.

**Tests executed (2026-11-07, Node 24.22.2, local PostgreSQL 16.15 with 20 connections):** typecheck pass; lint 0 errors/1 warning; cycles none; **185** unit/component tests pass (69 new); **34** database integration tests pass; production build pass; `npm audit` production 0, whole tree 17 moderate/low, 0 high/critical; real-server scenarios and acceptance-script runs recorded. Full table and the defects found and fixed: `docs/testing/TEST_EXECUTION_REPORT.md` ER-004.

**Known limitations:** everything was verified on a local PostgreSQL stand-in, **not on Aiven**; no live AI provider is called and no Gemini adapter exists; no OAuth or routes use sessions yet; the CI workflow is **not active** (GitHub rejected it: the token lacks the `workflow` permission) and, like `docker-compose.yml`, has never run; embedded worker is development-only and stops with the sleeping Render service; R2 payment-method requirement is unverified. See `docs/KNOWN_ISSUES.md` (open: KI-07..13, 16..19, 21..24, 26..31).

**Remaining B1 tasks (B1b), needing you:** (1) create the Aiven free service and run `npm run verify:infra` (and `-- --migrate`, and `-- --watch-reconnect` while restarting the service from the console); (2) decide the R2 question using the steps in `docs/deployment/SETUP_GUIDE.md` section 4 (no card without your approval); (3) create the Render free web service when ready; (4) provide a Gemini development key through a secure mechanism (no real learner data). Then: Gemini adapter with live synthetic-data tests (I will add `@google/genai` then), R2 adapter.

**Blockers:** DR-03 acceptance test (Aiven), DR-22 (R2), DR-02 (primary key billing), DR-18 (production blocker), to activate CI, copy `docs/deployment/ci.yml.example` to `.github/workflows/ci.yml` (web editor) or grant the token Workflows read/write. **Next recommended milestone:** B2 (authentication) once B1b checks pass.

## Research status
Provider comparison (`docs/architecture/AI_PROVIDER_COMPARISON.md`) is **in progress, not complete**. Arctic and ID-token verification findings are in `docs/architecture/TECH_RESEARCH.md` 1a.

## Delivery log
| Date | Update | ZIP | Commit | Push verified |
|---|---|---|---|---|
| 2026-11-04 | Planning documents | `RecallMap_2026-11-04_B0_Planning_Docs_1.zip` | `e7208012` | yes |
| 2026-11-04 | Status correction | `RecallMap_2026-11-04_B0_Planning_Docs_2.zip` | `95274908` | yes |
| 2026-11-04 | B0 engineering foundation | `RecallMap_2026-11-04_B0_Engineering_Foundation.zip` | `566579c` | yes |
| 2026-11-05 | B1 feasibility documents | `RecallMap_2026-11-05_B1_Feasibility_Docs.zip` | `b0e7a52` | yes |
| 2026-11-05 | Free-tier infrastructure plan | `RecallMap_2026-11-05_B1_FreeTier_Infrastructure_Plan.zip` | `da17084` | yes |
| 2026-11-07 | B1a backend foundation | `RecallMap_2026-11-07_B1a_Backend_Foundation.zip` | see the handoff message and `MANIFEST.txt` | recorded in the handoff message after the remote head is checked |
