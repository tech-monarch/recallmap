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
