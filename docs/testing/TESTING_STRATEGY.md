# RecallMap: Testing Strategy

**Status: strategy PLANNED; existing unit/UI tests are real and run (see `TEST_EXECUTION_REPORT.md`). Last updated 2026-11-04.**

## 1. Layers

| Layer | Tooling | Scope | Exists today |
|---|---|---|---|
| Unit | Vitest | domain rules (learner-state policy, recommendation eligibility, graph validation, layout functions), Zod schemas, adapters with fakes | yes for existing frontend logic (116 tests) |
| Component | Vitest + Testing Library (jsdom) | existing screens, loading/error/empty/demo-mode states | partial |
| Repository / DB | Vitest + real PostgreSQL (container) | migrations apply on an empty DB, constraints, ownership scoping, pgvector queries | no |
| API integration | Vitest + HTTP against route handlers | auth, validation, error envelope, pagination, **cross-user isolation for every route (generated from the route table)** | no |
| Worker / pipeline | Vitest with fake providers and fixture files | stage idempotency, retries, failure states, duplicate jobs, cancellation | no |
| AI evaluation | scripted evaluation sets, on demand | question correctness and ambiguity, concept/prerequisite quality, tutor accuracy and grounding, citation verification, personality guardrails, hallucination counts, per-feature cost | no |
| End to end | Playwright | sign-in (test Google account or stub), upload, review graph, study, practice, progress | no |
| Security | see `SECURITY_TEST_PLAN.md` | authn/z, sessions, CSRF, XSS, SQLi, uploads, rate limits, prompt injection, secrets, deletion | no |
| Performance | k6 or similar, measured before optimizing | API latency, key queries, document processing, OCR, graph generation, map rendering, tutor response time, queue throughput | no |
| Accessibility | axe + manual keyboard/screen-reader checks | all screens | no |
| Backup/restore | scripted drill | monthly restore into isolated Postgres | no |

## 2. Rules

- A test is "passed" only if executed and passing; results are recorded in `TEST_EXECUTION_REPORT.md` with date, environment, commands and evidence. No fabricated results or screenshots.
- AI calls are never made in unit/CI tests; recorded fixtures and fakes are used. Live-provider evaluation runs are manual and logged.
- Test data is synthetic. No real credentials or production data in tests.
- Every new route ships with validation, ownership, and rate-limit tests. Every learner-state rule ships with the cases in `LEARNER_STATE_POLICY.md` section 9.
- CI order: typecheck, lint, unit/component, DB/API integration, security checks (`npm audit`, secret scan, static analysis), build. A failed critical test blocks the milestone.
- Test documents follow the defence-ready structure: `docs/testing/{TESTING_STRATEGY, TEST_ENVIRONMENT, FUNCTIONAL_TESTS, API_TESTS, SECURITY_TEST_PLAN, SECURITY_TEST_CASES, PERFORMANCE_TESTS, INTEGRATION_TESTS, TEST_EXECUTION_REPORT, DEFECTS_AND_REMEDIATION}.md` and `TEST_EVIDENCE/`. Only strategy, security plan, and the execution report exist now; the others are created when the first test of that kind exists, not as empty files.

## 3. Statuses

Planned, Executed, Passed, Failed, Blocked, Retested.

## 4. Commands (B1a, 2026-11-07; run on Node 24)

| Command | What it runs | Needs |
|---|---|---|
| `npm run typecheck` | `tsc --noEmit` | nothing |
| `npm run lint` | ESLint 9 including the architecture boundary rules | nothing |
| `npm run check:cycles` | import-cycle check over `src/` and `worker/` | nothing |
| `npm test` | Vitest unit and component tests (database tests excluded) | nothing |
| `npm run test:db` | database integration tests: migrations, constraints, isolation, sessions, worker, queue, status, embedded-once | `TEST_DATABASE_URL` pointing at a PostgreSQL whose **database name contains "test"** (the suite drops everything in it) |
| `npm run validate` | typecheck, lint, tests, cycle check | nothing |
| `npm run verify:infra` | acceptance script for a real PostgreSQL service (Aiven) | admin `DATABASE_URL`, run by the owner |

Negative checks that were performed once and are recorded in ER-004: deliberate boundary violations (lint must fail), a deliberate import cycle (check must fail), and two mutations of the repository ownership filters (isolation tests must fail). They are procedures, not automated tests.
