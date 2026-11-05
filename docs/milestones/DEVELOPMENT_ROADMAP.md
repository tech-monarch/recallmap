# RecallMap: Development Roadmap (revised against the Master Directive)

**Status: PLAN. No milestone beyond the existing frontend prototype is started or approved for implementation.** Existing UI milestones M1-M5 (and part of M6) are history; backend work uses **B0-B8**. Complexity: S (days), M (about 1-2 weeks), L (2-4 weeks), XL (4+ weeks), as rough single-developer-with-AI estimates, to be refined after B1 feasibility. Last updated 2026-11-04.

Every milestone ends with: tests and checks run, documentation updated, security check, commit, push, verified ZIP, handoff in `docs/milestones/CURRENT_STATUS.md`.

| ID | Milestone | Depends on | Complexity |
|---|---|---|---|
| B0 | Engineering foundation | DR-01 | S |
| B1 | Infrastructure and application foundation | B0, DR-03, DR-05 | M |
| B2 | Authentication, users, privacy basics | B1 | M |
| B3 | Curriculum, subjects, document library | B2, DR-06, DR-07, DR-09 | XL |
| B4 | Knowledge graph and maps | B3, DR-08 | L |
| B5 | Learning and assessment (tutor, questions, attempts, evidence rows) | B4, DR-02 | L |
| B6 | Adaptive intelligence (policy engine, recommendations, companion) | B5, DR-04 | L |
| B7 | Progress, history, retention | B6 | M |
| B8 | Production readiness | all | L |

## B0: Engineering foundation (no feature work): **COMPLETE 2026-11-04 (see CURRENT_STATUS.md)**
- **Objectives:** a verified, honest baseline; repository hygiene; reconciled docs.
- **Tasks:** apply DR-01 items; re-run typecheck, tests, lint, audit; fix stale doc claims (test counts, palette/fonts); initialize workflow (branch, commit conventions); keep the frontend unchanged.
- **Deliverables:** green typecheck/tests/lint, build verified in a networked environment or with self-hosted fonts, `npm audit` with no critical/high or documented exceptions, updated docs, ZIP.
- **Acceptance:** BL-02..BL-06 re-run and recorded; `.env.example` tracked; repo has no nested ZIP.
- **Tests:** existing 116 tests still pass. **Risks:** Next upgrade breaks something (mitigate with tests and a build check).

## B1: Infrastructure and application foundation
- **Objectives:** the platform every module sits on.
- **Tasks:** feasibility checks (Section 5 of the AI doc); Aiven database, Drizzle setup, first migration (extensions only), Zod env validation, `src/contracts` and `src/server/platform`, repository pattern with user scoping, request context, error envelope, logging, `/health`, R2 adapter and `ObjectStore` interface, pg-boss wiring and a worker skeleton, Gemini adapter with slot logic and fakes, CI with a Postgres service container, lint rules for the boundaries.
- **Acceptance:** migrations apply on an empty DB in CI; pgvector extension present; worker starts, runs a test job with retry and dead-letter behaviour; AI adapter tests cover every row of the failure table; boundary lint passes; no secrets in repo.
- **Tests:** repository scoping tests, config tests, adapter tests, queue tests. **Risks:** Aiven/pgvector/pg-boss incompatibility (DR-03), connection limits.

## B2: Authentication, users, privacy basics
- **Tasks:** Google OAuth (state, PKCE, ID token verification), sessions, `/me`, session list/revoke, app and learning preferences (replace localStorage with server, keep local theme), onboarding flow, route guard, remove/park email-password screens (DR-11), deletion-request foundation, draft privacy policy and AI notice, rate limits on auth, security headers baseline, cross-user test harness.
- **Acceptance:** SEC-AUTH, SEC-SESS, SEC-CSRF, SEC-LEAK suites executed and recorded; unauthenticated `/dashboard` redirects; first-login onboarding gate works.
- **Risks:** OAuth misconfiguration, cookie domain issues, legal wording (DR-16).

## B3: Curriculum, subjects, document library
- **Tasks:** curriculum template/version tables and seed path; subject instances CRUD/archive/delete; uploads (presign, complete, status), worker pipeline stages 1-6 (validation, extraction for all target formats, OCR, sections, chunks, embeddings), pasted text, processing states and retry/cancel/delete, frontend library connected to the API through the `DataSource`, demo mode isolated.
- **Acceptance:** each target format yields readable sections or a clear failed state; scanned PDF OCR works on a sample; SEC-UPLOAD suite executed; no failed document ever shown as ready; orphan reconciliation job works.
- **Risks (largest in the project's infrastructure):** parser vulnerabilities and resource use, OCR quality/cost, embedding model choice, worker memory.

## B4: Knowledge graph
- **Tasks:** concept/prerequisite tables with provenance, revisions and sources; AI proposal job with verified sources; review UI (add/edit/remove/connect/reject); cycle validation; hierarchical and dynamic layouts through a library; layout preference saved; selected-concept and context preserved across layouts.
- **Acceptance:** same graph renders in both layouts without changing data; cycles and disconnected nodes handled; AI proposals never auto-confirmed; evaluation set run for concept/prerequisite quality with results recorded.
- **Risks:** quality of AI prerequisite edges (biggest product risk), layout accessibility.

## B5: Learning and assessment
- **Tasks:** study sessions; tutor with grounded retrieval and labelled segments; question generation (MCQ, true/false, short answer) with validation; assessments, attempts, answers; deterministic grading and AI-graded short answers; evidence rows recorded; feedback separated from scoring.
- **Acceptance:** objective grading works with AI off; citations verified; SEC-PI and SEC-AI suites executed; AI evaluation runs recorded. `AI_LEARNER_CONTENT_ENABLED` stays false in production until DR-02 is resolved.
- **Risks:** question quality, prompt injection, cost, provider terms.

## B6: Adaptive intelligence and personalization
- **Tasks:** policy engine v1 (approved thresholds), `policy_versions`, derivations, transitions, recompute tooling and shadow mode; gap identification; recommendation eligibility and AI explanation; companion personality evaluation; learning preferences feeding prompts.
- **Acceptance:** LS-01..LS-21 pass; states reproducible from stored derivations; AI cannot produce an ineligible recommendation.
- **Risks:** thresholds uncalibrated, small-sample noise.

## B7: Progress, history, retention
- **Tasks:** progress and trends read models from evidence; persistent history; `revision_status`, scheduling engine, revision scan job, retention checks.
- **Acceptance:** dashboard numbers match evidence; time spent never affects mastery; due revisions show "Needs review" alongside the state.
- **Risks:** scheduling parameters without data.

## B8: Production readiness
- **Tasks:** full integration, Playwright suite, security and performance testing, backup jobs and restore drill, monitoring and operations dashboard, incident and recovery docs, legal pages finalized and reviewed, accessibility audit, staging then production deployment, final acceptance.
- **Acceptance:** release gates in `SECURITY_ARCHITECTURE.md` section 5 satisfied; restore verified; no critical/high unresolved issue without a reviewed exception.

## Not before their prerequisites
Retention scheduling before assessment evidence exists; AI recommendations before deterministic eligibility; secondary Gemini key before G1-G6; any learner-content AI feature in production before DR-02.
