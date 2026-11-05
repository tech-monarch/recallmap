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
