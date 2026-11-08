# Changelog

## 2026-11-07: B1a backend foundation (implementation, verified locally)
- **Added:** Zod environment configuration with connection-budget and DR-18 guards; shared contracts; redacting structured logger; error envelope and route wrapper; Drizzle schema and migration `0000_identity_foundation` (users, auth_identities, sessions, oauth_states, app_preferences, learning_preferences, worker_heartbeats); user-scoped repositories and services (users, preferences, sessions); session tokens/cookies; vendor-neutral AI interfaces, fake provider, circuit breaker and gateway; object-store interface and fake; pg-boss worker (embedded and standalone) with heartbeats and job status; `GET /api/v1/health`; `instrumentation.ts` embedded-worker hook; `worker/index.ts`; `scripts/migrate.ts`, `scripts/verify-infra.ts`, `scripts/check-cycles.mjs`.
- **Tooling:** Node 24 pinned (`.nvmrc`, `engines`); ESLint boundary rules; split Vitest configs (`npm test`, `npm run test:db`); `.env.example` rewritten; `docker-compose.yml` and init SQL (untested); GitHub Actions workflow (never run).
- **Dependencies added:** `drizzle-orm`, `pg`, `pg-boss` (runtime); `drizzle-kit`, `@types/pg`, `tsx` (dev).
- **Database changes:** first migration only; no extensions.
- **Tests:** 185 unit/component (69 new) and 34 database integration tests pass; real-server scenarios and acceptance-script runs recorded in ER-004.
- **Fixed during the work:** empty-enum config bug; gateway fallback gaps; embedded SIGTERM drain.
- **Docs:** provider comparison started (in progress), Arctic/ID-token verification, Render Node 24 verified, R2 payment-method question documented as unverified, decisions DR-19 to DR-22 updated.
- **No frontend feature changes. No breaking changes. Nothing is deployed and no paid service was used.**

## 2026-11-05: Free-tier infrastructure planning (documentation only)
- Added `docs/deployment/FREE_TIER_INFRASTRUCTURE.md`, `docs/deployment/SETUP_GUIDE.md`, `docs/architecture/TECH_RESEARCH.md`, `docs/testing/INFRA_COMPATIBILITY_SPIKE.md` (ER-003).
- Recorded owner decisions: Aiven free plan (DR-03), Render free tier (DR-05), Gemini with synthetic data only and DR-18 as a production blocker, DR-02 still open; added DR-19 to DR-23.
- Findings: Aiven free = 1 GB / 20 connections / no pooling / may power off; Render free has no free worker and spins down after 15 idle minutes; R2 free allowance verified; Drizzle + pgvector + pg-boss work within a simulated 20-connection limit; pg-boss needs `exclusive`-style queue policies for deduplication.
- **No application code, dependency or configuration changes.**

## 2026-11-05: B1 feasibility verification (documentation only)
- Added `docs/architecture/FEASIBILITY_VERIFICATION.md` (sources and dates). Findings: Gemini API terms forbid use in applications directed at or likely accessed by under-18s (new DR-18, KI-20); unpaid versus paid data-use terms confirmed; Nigeria is an available region; R2 presigned URLs cannot enforce a length range (design corrected); Aiven pgvector 0.8.1 and PgBouncer facts; pg-boss requirements; Gemini embedding models and dimensions.
- No code, dependency, or configuration changes.

## 2026-11-04: B0 engineering foundation (code and configuration)
- **Security:** `next` 16.3.8 -> 16.4.5 (affected by two critical RCE advisories and one high DoS advisory). `npm audit`: 23 findings (1 critical) -> 13 (0 high, 0 critical); production dependencies 0.
- **Tooling:** ESLint 8 -> 9.39.5, `eslint-config-next` 14 -> 16.4.5; `npm run lint` now runs (exit 0, 1 warning). Fixed `useIsMobile` (`react-hooks/set-state-in-effect`) using `useSyncExternalStore`; removed a stale `eslint-disable`.
- **Build:** fonts self-hosted (`app/fonts/`, `next/font/local`); production build passes without Google network access.
- **Dependencies removed:** `recharts`, `react-hook-form`, `@hookform/resolvers`, `@google/genai`, `framer-motion`, `react-icons`; deleted two unrendered components (`ScrollToTop`, `DiagonalLines`). `shadcn` moved to devDependencies.
- **Repository:** removed nested `recallmap.zip`; `.gitignore` now tracks `.env.example` and ignores `*.zip`; added `.gitattributes` (LF); removed unused `/sw.js` header rules from `next.config.ts`.
- **Docs:** corrected `HANDOFF.md` and `MILESTONE_STATUS.md`; resolved KI-01..06, 14, 15; added ER-002 test report; DR-01 marked resolved.
- **No database, API, authentication or feature changes. No breaking changes.** Tests: typecheck, 116 tests, lint, build and a start-server smoke test all pass.

## 2026-11-04: Planning and documentation (B0 inspection, no code changes)
- Added architecture, schema, API, AI/document pipeline, learner-state policy, security, deployment, compliance, testing, roadmap, and decision-register documents reflecting the owner's approved Master Directive (A-G) and the S1/S2/S3, worker/queue, and GitHub decisions.
- Recorded the engineering baseline (typecheck pass, 116 tests pass, lint broken, build blocked by sandbox network, `npm audit` critical Next.js advisory).
- Marked `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md` as partly superseded.
- **No application code, dependencies, migrations, or configuration were changed.**
- Commit `e7208012` pushed to `origin/main`; status file corrected in a follow-up docs-only commit.

## 2026-10-26 (earlier history, from repository log)
- Initial commits: frontend prototype through milestone 5/6 (see `HANDOFF.md`, `MILESTONE_STATUS.md`).
