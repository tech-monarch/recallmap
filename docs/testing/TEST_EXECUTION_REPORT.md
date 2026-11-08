# RecallMap: Test Execution Report

Only **executed** results appear here. Nothing is recorded as passed unless it ran and passed. Planned tests are in `SECURITY_TEST_PLAN.md` and `TESTING_STRATEGY.md`.

## ER-001: Engineering baseline (B0 inspection)

| Field | Value |
|---|---|
| Date | 2026-11-04 |
| Environment | Claude sandbox, Ubuntu, Node v22.23.4, npm 10.9.9; a throwaway copy of repository `main` at `7d67170` (no `.git`, repository not modified); network limited to an allowlist (npm registry, GitHub) |
| Prerequisites | none; `npm ci --no-audit --no-fund` |
| Evidence | command output captured in the session; not stored as files in this repository |

| ID | Command | Result | Status |
|---|---|---|---|
| BL-01 | `npm ci` | installed 782 packages in about 25 s; deprecation warnings including `eslint@8.57.1` (unsupported) and `glob` 7/10 | Passed |
| BL-02 | `npx tsc --noEmit` | exit code 0, no output | **Passed** |
| BL-03 | `npx vitest run` | 12 test files, **116 tests, all passed**, about 19 s. Project docs claimed 109 tests in 11 files, so those docs are stale | **Passed** |
| BL-04 | `npx eslint` | ESLint 8.57.1 starts, then fails loading `eslint.config.mjs`: `ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './config' is not defined by "exports"` (the config imports `eslint/config`, which ESLint 8 does not export) | **Failed** (configuration defect confirmed) |
| BL-05 | `npx next build` | failed: Turbopack could not fetch Google Fonts (Manrope, Source Sans 3, JetBrains Mono) because the sandbox network cannot reach `fonts.googleapis.com`. This is an **environment limitation, so the build result is inconclusive**, not a confirmed code defect. It does show the build depends on live network access to Google Fonts | **Blocked** (re-run in an environment with network, or self-host fonts) |
| BL-06 | `npm audit` | 23 vulnerabilities (1 low, 11 moderate, 10 high, **1 critical**); production-only: 15 (1 low, 6 moderate, 7 high, 1 critical) | **Failed** (findings below) |

### BL-06 findings (direct dependencies and notable transitive)

| Package | Severity | Advisory summary | Notes |
|---|---|---|---|
| `next` 16.3.8 (direct) | **critical** (2 advisories) + high | unauthenticated RCE in the image optimization API when SVG files are used (GHSA-2464-fhr4-w9xw); unauthenticated RCE in `use cache` functions returning typed arrays (GHSA-673q-mjm6-r5xr); DoS in App Router using Server Actions (GHSA-p3m5-59mp-jv5r). Affected range 16.0.0 to 16.4.0. npm registry latest: 16.4.5 | **Source inspection** of this repo: no `next/image`, no `"use cache"`/`cacheComponents`, no `"use server"`, no `images` config, no tracked SVGs. So the flagged code paths do not appear to be used, but exposure of a deployed instance is **not verified**. Upgrade is still required (B0) |
| `eslint-config-next` (direct) | high | via `glob`/`@next/eslint-plugin-next`; fix `eslint-config-next@16.4.5` | also part of the lint fix |
| `shadcn` (direct, runtime dependency) | high | transitive (`zod`, `body-parser`, `systeminformation`, `undici`, ...) | the package is a CLI and appears unused at runtime; verify then remove |
| `sharp` (via Next) | high | librsvg dependency advisory | fixed by Next upgrade path |
| `zod` (inside `shadcn` tree) | high | memory exhaustion on oversized constrained collections | will matter if `zod` is used for untrusted input: pin a fixed version |
| `undici`, `body-parser`, `qs`, `minimatch`, `glob`, others | moderate to high | transitive | mostly dev/CLI tooling; reassess after upgrades |

Not executed: Playwright/e2e (none exist), security tests (none exist), browser/responsive/accessibility checks, deployment verification.

### Resulting defects (tracked in `docs/KNOWN_ISSUES.md`)

KI-01 ESLint cannot run; KI-02 Next.js affected by critical advisories; KI-03 build requires Google Fonts network access; KI-04 docs claim wrong test counts; KI-05 `.env.example` untracked.


## ER-002: B0 re-run after changes

| Field | Value |
|---|---|
| Date | 2026-11-04 |
| Environment | same sandbox as ER-001 (Node v22.23.4, npm 10.9.9), working clone of `main` after the B0 commits; network limited to an allowlist |
| Changes under test | Next 16.3.8 -> 16.4.5; ESLint 8 -> 9.39.5 and `eslint-config-next` 14 -> 16.4.5; unused dependencies removed; fonts self-hosted; hygiene fixes |

| ID | Command | Result | Status |
|---|---|---|---|
| BL-02 (re-run) | `npx tsc --noEmit` | exit 0 | **Passed** |
| BL-03 (re-run) | `npx vitest run` | 12 files, **116 tests passed** (re-run after each of the three code-affecting commits) | **Passed** |
| BL-04 (re-run) | `npx eslint` | exit 0; 0 errors, 1 warning (`iconClassName` unused in `components/reusables/BrandMark.tsx`, a component nothing renders). Before the fix: 1 error (`react-hooks/set-state-in-effect` in `hooks/use-mobile.ts`) and 2 warnings, now resolved | **Passed** (1 warning) |
| BL-05 (re-run) | `npx next build` | exit 0; Next 16.4.5 (Turbopack); compiled, type-checked, 17 pages generated; no network access to Google needed | **Passed** |
| BL-07 | `next start` smoke test on port 3100 | `/`, `/auth/login`, `/dashboard`, `/dashboard/map`, `/dashboard/progress`, `/api/sidebar-images` all HTTP 200; homepage HTML has no googleapis/gstatic references; three self-hosted woff2 files referenced | **Passed** (HTTP/HTML level only; no browser rendering check) |
| BL-06 (re-run) | `npm audit` | whole tree: 13 findings (2 low, 11 moderate), **0 high, 0 critical**; production dependencies (`--omit=dev`): **0 findings** | **Passed** against the "no unresolved critical/high" gate; moderate/low dev-tooling findings remain and are tracked |

Limits: no browser/visual regression check was performed for the font change or the `useIsMobile` rewrite (the hook is exercised by the existing component tests only indirectly); Playwright/e2e does not exist yet; security tests and accessibility checks not executed.


## ER-003: Infrastructure compatibility spike (simulation)

| Field | Value |
|---|---|
| Date | 2026-11-05 |
| Environment | Sandbox, local PostgreSQL 16.15 with `max_connections=20`, pgvector 0.6.0, non-superuser owner role; Node 22.23.4; drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, pg-boss 12.38.1 |
| Scope | **Simulation of the Aiven free plan limits, not Aiven itself** |
| Result | 13 of 16 checks passed; 3 observations (no `singletonKey` deduplication on standard queues, about 17 usable connections, `vector` not creatable by a non-superuser) feed the design. Full table and scripts: `docs/testing/INFRA_COMPATIBILITY_SPIKE.md` |
| Status | **Passed with observations**; Aiven acceptance test (`docs/deployment/SETUP_GUIDE.md` 7.3) **Planned, owner to run** |

## ER-004: B1a backend foundation (verified locally)

| Field | Value |
|---|---|
| Date | 2026-11-07 |
| Environment | Claude sandbox. **Node v24.22.2** (installed as the `node@24` npm package into a temporary directory because the sandbox default is Node 22.23.4), npm 10.9.9. PostgreSQL **16.15** (Ubuntu package) on localhost, `max_connections=20`, `shared_buffers=128MB`, application role `appadmin` (non-superuser, database owner). **This is a local stand-in, not Aiven.** |
| Not executed | The Aiven acceptance test; any Render deployment; the GitHub Actions workflow; `docker compose` (no Docker in the sandbox); any browser or visual check; any live AI provider call (no adapter exists) |

### Results on the final tree

| ID | Command | Result | Status |
|---|---|---|---|
| B1a-01 | `npm run typecheck` | exit 0 | Passed |
| B1a-02 | `npm run lint` | exit 0: 0 errors, 1 warning (`iconClassName` unused in `components/reusables/BrandMark.tsx`, KI-18) | Passed |
| B1a-03 | `npm run check:cycles` | no cycles in 39 files | Passed |
| B1a-04 | `npm test` | **18 files, 185 tests passed** (116 existing + **69 new**: config 11, logger 8, http/errors 10, tokens/cookie 7, AI gateway 23, storage/health/payloads 10) | Passed |
| B1a-05 | `npm run test:db` (`TEST_DATABASE_URL` to the local database) | **4 files, 34 tests passed**: migrations and constraints, per-user isolation, session lifecycle, worker/queue/status/embedded-once | Passed (local PostgreSQL 16 only) |
| B1a-06 | `npm run build` (Next 16.4.5) | exit 0; 17 static pages unchanged plus dynamic `/api/v1/health` | Passed |
| B1a-07 | `npm audit --omit=dev` | 0 vulnerabilities | Passed |
| B1a-08 | `npm audit` (whole tree) | 17 findings (2 low, 15 moderate), **0 high, 0 critical**; direct packages with findings: `drizzle-kit`, `eslint-config-next`, `shadcn` (all dev tooling) | Passed against the "no unresolved critical/high" gate; KI-31 |

### Negative checks (procedures run once, not automated)

| ID | Check | Result |
|---|---|---|
| B1a-N1 | Four deliberate violations (server imports React; contracts import server code; one module imports another's repository; a server module imports frontend code) | ESLint failed on all four, then the files were removed |
| B1a-N2 | Deliberate import cycle | `check:cycles` exited 1 and printed the cycle, then removed |
| B1a-N3 | Mutation: removed the `user_id` filter from `SessionRepository.revokeForUser` | the isolation tests **failed** (3 failures), source restored and re-verified identical |
| B1a-N4 | Mutation: removed the `user_id` filter from `PreferencesRepository.getApp` | the isolation tests **failed** (1 failure), source restored and re-verified identical |

### Real-server scenarios (`next start` on the production build, local PostgreSQL)

| Scenario | Observed |
|---|---|
| A. No environment at all | `GET /api/v1/health` 200 `degraded` (database `not_configured`); `/`, `/dashboard`, `/dashboard/map`, `/auth/login` all 200 |
| B. Database configured, `WORKER_MODE=off` | 200 `ok` |
| C. `WORKER_MODE=embedded` | `ok`, worker `running`, one heartbeat row; repeated calls did not create a second worker. **First run found a defect:** after SIGTERM the heartbeat remained (KI-25). After the fix (hold `process.exit` until the bounded drain finishes, only once a shutdown signal arrived) the re-run showed heartbeat rows 0, "worker stopped" logged, process exited |
| D1. Database unreachable | 503 `down`, `database: unavailable`; frontend pages still 200 |
| D2. Invalid configuration (embedded without a database) | 503 `down`, `config: invalid`; frontend pages still 200 |
| E. Database stopped then restarted while the server ran | 503 `down`, then back to `ok` on its own (no server restart) |
| Log hygiene | credentials/connection strings leaked in server logs across all runs: 0 |

An earlier run of this script gave wrong results because my script killed only the `npx` wrapper and a stale server kept answering; it was discarded and re-run with process-group handling.

### Acceptance script (`npm run verify:infra`) against the local database

| Run | Result |
|---|---|
| Non-superuser role with `--migrate` | 6 passed, **2 failed as expected**: `CREATE EXTENSION vector` is refused for a non-superuser on vanilla PostgreSQL, and the dependent vector query fails; migrations, pg-boss round trip, schema privilege passed; connection cap observed |
| Superuser | all checks passed (pgvector 0.6.0 locally) |
| `--watch-reconnect` while PostgreSQL was stopped and started | reported DOWN, then RECONNECTED after about 6.0 s on the same pool object |

### Defects found and fixed during B1a

1. Empty enum values in the environment (`WORKER_MODE=`) failed validation; only some fields normalised empty strings. Fixed, tested.
2. The AI gateway could route to the secondary key when the primary breaker was open for an auth error, or when no primary existed. Fixed, tested.
3. Embedded worker did not drain on SIGTERM (KI-25). Fixed, verified on the real server.
4. pg-boss v12 `stop()` has no `wait` option; the spike scripts passed one that was ignored. Documentation corrected.
5. A test-arithmetic mistake on the connection budget (12 + 2 + 3 = 17 is within budget). Test corrected.
