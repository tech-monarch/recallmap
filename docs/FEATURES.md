# RecallMap: Feature Inventory

Last updated 2026-11-04. Statuses: Planned, In Progress, Partially Implemented, Implemented, Tested, Blocked, Deprecated. "Tested" means automated tests exist **and were executed** (ER-001). A visible UI is never "Implemented" on its own.

| Feature | Status | Frontend | Backend | Notes / remaining |
|---|---|---|---|---|
| Landing page | Implemented | static page | n/a | remove the "open workspace" bypass once auth exists |
| Google sign-in | Planned | button only | none | B2 |
| Email/password, forgot/reset | Deprecated for launch (DR-11) | screens + client | none | out of launch scope |
| Session, route guard, `/me` | Planned (session token/hash/cookie/service foundation exists and is tested, not wired to any route; see the B1a section) | none | partial foundation | B2 |
| Onboarding | Planned | placeholder | none | B2 |
| App and learning preferences | Partially Implemented | localStorage only in the UI | repository + service + tables exist and are tested, not wired to any route | server wiring in B2 |
| Theme | Tested (unit) | light/dark/system, local | n/a | |
| Subjects (create) | Partially Implemented | in-memory | none | CRUD, archive, delete B3 |
| Curriculum templates and versions | Planned | none | none | B3 |
| Materials: PDF/DOCX/PPTX/TXT/MD/images/XLSX, OCR | Planned | PDF upload validates type then discards | none | B3 |
| Materials: pasted text | Partially Implemented | in-memory | none | B3 |
| Document processing, embeddings, pgvector | Planned | none | none | B3 |
| AI knowledge-graph generation | Planned | none | none | B4 |
| Knowledge map view | Partially Implemented (mocked data, hardcoded layout) | yes | none | B4 |
| Hierarchical and dynamic layouts, saved preference | Planned | none | none | B4 |
| Concept add/edit/remove/connect with provenance | Planned | none | none | B4 |
| AI tutor (grounded) | Planned | demo canned replies (5/13 concepts) | none | B5 |
| Question generation and assessment (MCQ, T/F, short) | Planned | 3 demo questions, local grading tested | none | B5 |
| Evidence recording | Planned | none | none | B5 |
| Learner-state engine | Planned (policy proposed, not approved) | derivations on demo data (tested) | none | B6 |
| Gap detection | Planned | demo states | none | B6 |
| Recommendations | Partially Implemented (client rules on demo data) | yes | none | eligibility + AI explanation B6 |
| Progress dashboard | Partially Implemented (derivations tested, demo data) | yes | none | B7 |
| Learning history | Partially Implemented (demo data) | yes | none | B7 |
| Revision / spaced repetition | Planned (schema reserved) | none | none | B7 |
| Demo mode isolation | Planned | mixed today | n/a | `DataSource`, B3 |
| Legal and information pages | Planned | none | n/a | B2-B8 |
| Backups, monitoring, ops dashboard | Planned | n/a | none | B8 |

## Backend foundation (B1a, 2026-11-07; verified locally on Node 24 and a 20-connection PostgreSQL 16, not on Aiven)

| Feature | Status | Notes |
|---|---|---|
| Environment configuration (Zod), connection-budget check, DR-18 guard | Tested | `src/server/platform/config.ts` |
| Error envelope, request ids, route wrapper | Tested | no stack traces or internals returned |
| Structured logger with secret and personal-data redaction | Tested | by key and by value pattern |
| Drizzle schema and migration for identity tables | Tested (local PostgreSQL only) | pgvector deliberately not enabled yet |
| User-scoped repositories and per-user isolation | Tested (repository and service level, including mutation checks) | route-level isolation tests come with the routes |
| Opaque session service (hashing, expiry, rotation, revocation) | Tested | not wired to any route; no OAuth yet |
| AI gateway (data-mode guard, eligibility, fallback rules, breaker) with a fake provider | Tested | no Gemini adapter yet; no real provider is called |
| Object-store interface and fake | Tested | no R2 adapter yet |
| pg-boss worker (embedded, standalone), heartbeat, job status | Tested (local PostgreSQL) | embedded mode is development-only |
| `GET /api/v1/health` | Tested on the real server | shallow, public |
| Boundary lint rules, cycle check | Tested (including negative checks) | |
| CI workflow | **Not active.** Stored as `docs/deployment/ci.yml.example`; never run; GitHub rejected pushing it (token lacks `workflow` permission) | |
| Aiven acceptance script (`npm run verify:infra`) | Tested locally; **not run on Aiven** | owner runs it |
