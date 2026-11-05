# RecallMap: API Contract Proposal (v1)

**Status: PROPOSED. No endpoint is implemented.** This replaces the planning content of `docs/API_CONTRACTS.md` (kept for history, see section 5). Last updated 2026-11-04.

## 1. Conventions

- Base path `/api/v1`. Breaking changes ship as `/api/v2`; additive fields are non-breaking.
- JSON only (file bytes go directly to R2). All request and response shapes are Zod schemas in `src/contracts`, shared by UI and server; the server validates body, query and path params.
- **Authentication:** session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`). Identity is always derived from the session, never from a client-sent user id. Every route except `/auth/*` and `/health` requires a session.
- **CSRF:** unsafe methods (POST/PUT/PATCH/DELETE) require a matching `Origin` header and a custom header (for example `X-RecallMap-Client: web`); verified in tests (SEC-CSRF-*).
- **Errors:** `{ "error": { "code": string, "message": string, "requestId": string, "details"?: ... } }`. Stable codes: `unauthenticated`, `forbidden` (used sparingly, ownership failures return `not_found` to avoid leaking existence), `not_found`, `validation_failed`, `rate_limited`, `conflict`, `ai_unavailable`, `unsupported_file`, `payload_too_large`, `processing_failed`, `internal`.
- **Pagination:** cursor based (`?cursor=&limit=`), response `{ items, nextCursor? }`. No unbounded lists.
- **Idempotency:** creating POSTs that start work (upload completion, graph generation, attempt completion) accept `Idempotency-Key`.
- **Rate limits** (per user and IP, values configurable): auth, upload authorization, AI endpoints, generation jobs; `429` with `Retry-After`.
- **Ownership:** every `:id` is checked against `userId` in the repository; cross-user access returns `404`.

## 2. Endpoint groups

| Group | Endpoints | Responsibility / notes |
|---|---|---|
| Auth | `GET /auth/google` (start; sets state + PKCE), `GET /auth/google/callback`, `POST /auth/signout`, `GET /me` | callback verifies state and ID token server-side, upserts `auth_identities`/`users`, issues session, redirects to `/onboarding` (new) or `/dashboard`. `GET /me` -> `{ id, name, email, avatarUrl, onboarded, appPreferences, learningPreferences }` |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/:id` | list/revoke own sessions |
| Preferences | `PUT /me/app-preferences` (theme, mapLayout, accessibility), `PUT /me/learning-preferences`, `POST /me/onboarding/complete` | two separate resources (application vs learning preferences) |
| Account | `POST /me/deletion` (account), `GET /me/deletion/:id` | creates a deletion request; data hidden immediately |
| Curriculum | `GET /curriculum/templates`, `GET /curriculum/templates/:id/versions/:v` | read-only for learners; authoring is an admin/seed path (DR-09) |
| Subjects | `GET/POST /subjects`, `GET/PATCH /subjects/:id`, `POST /subjects/:id/archive`, `DELETE /subjects/:id` | `POST` accepts optional `curriculumVersionId`; delete requires a confirmation field and starts a deletion job |
| Materials | `GET /subjects/:id/materials`, `POST /subjects/:id/materials/uploads` (declare file -> presigned R2 PUT URL + material id), `POST /materials/:id/complete` (verify object, enqueue), `POST /subjects/:id/materials/text` (pasted text), `GET /materials/:id` (status + sections), `POST /materials/:id/retry`, `POST /materials/:id/cancel`, `DELETE /materials/:id` | upload authorization validates ownership, extension, declared MIME, size, quota; the worker re-validates magic bytes and structure. `status` values per `DATABASE_SCHEMA.md` |
| Knowledge | `GET /subjects/:id/map` (`{ concepts, prerequisites, learnerStates, revision }` as separate lists), `POST /subjects/:id/map/generate`, `POST /subjects/:id/map/confirm`, `GET/POST /subjects/:id/concepts`, `PATCH/DELETE /concepts/:id`, `PUT /concepts/:id/prerequisites`, `GET /concepts/:id/sources` | edits record provenance (`manual`/`edited`) and a `concept_revisions` row; AI proposals arrive `review_status=proposed`; cycle check on prerequisite writes |
| Learning | `POST /concepts/:id/study-sessions`, `POST /study-sessions/:id/complete`, `GET /concepts/:id/practice`, `POST /assessments` (generate/define), `POST /assessments/:id/attempts`, `POST /attempts/:id/answers`, `POST /attempts/:id/complete`, `GET /attempts/:id`, `GET /evidence?conceptId` | answers are graded deterministically where objective; short answers may be `grading_status=pending` while AI grades; the response separates `score`, `feedback`, and optional `inferredMisconception` (unconfirmed) |
| Tutor | `POST /conversations`, `GET /conversations`, `GET /conversations/:id/messages`, `POST /conversations/:id/messages`, `DELETE /conversations/:id` | server builds minimal context; reply includes labelled `segments` (grounded / general / unsupported) with verified `sources`; `503 ai_unavailable` when no eligible provider |
| Progress | `GET /progress?subjectId`, `GET /progress/trends?subjectId&from&to`, `GET /gaps?subjectId` | derived from recorded evidence, never from time spent |
| History | `GET /history?subjectId&type&cursor` | completed activities only |
| Recommendations | `GET /recommendations?subjectId`, `POST /recommendations/:id/accept`, `POST /recommendations/:id/dismiss` | only rule-eligible items; each has `ruleCode` and an explanation |
| Revision (later) | `GET /revision/due`, `POST /revision/:conceptId/complete` | built after assessment works (C12) |
| Operations | `GET /health` (public, shallow), `GET /health/deep` (authenticated operator only: DB, queue depth, worker heartbeat), `GET /ops/jobs/:id` (owner of the material only) | no internals leaked |

## 3. Request/response boundaries (selected shapes)

```text
POST /subjects/:id/materials/uploads
  <- { filename, contentType, sizeBytes, sha256? }
  -> 201 { materialId, upload: { url, method: "PUT", headers, expiresAt } }

POST /attempts/:id/answers
  <- { questionVersionId, response }            // response shape depends on question type
  -> 200 { answerId, gradingStatus: "graded"|"pending",
           score?: 0..1, correct?: boolean,
           feedback?: string,                     // explanation text, separate from the score
           inferredMisconception?: { text, confidence: "low"|"medium"|"high" } } // always unconfirmed

GET /subjects/:id/map
  -> { concepts: [...provenance, reviewStatus], prerequisites: [...],
       learnerStates: [{ conceptId, state, policyVersion }],
       revision: [{ conceptId, status, dueAt? }] }
```

## 4. Authorization matrix (summary)

| Resource | Rule |
|---|---|
| Anything under a subject, material, concept, question, attempt, conversation, recommendation | `row.user_id = session.userId` or `404` |
| Curriculum templates | any authenticated user may read published versions; writes only via admin/seed path |
| Operator endpoints | allowlist of operator user ids/role, separate from learners |
| Presigned upload URL | single object key, content-length-range, short expiry, bound to that material id |

Cross-user tests (IDOR) are generated per route from the route table so a new route cannot ship without one.

## 5. Conflicts with `docs/API_CONTRACTS.md` and the code that follows it

| # | Existing contract | Conflict / resolution |
|---|---|---|
| 1 | `POST /api/auth/sign-in`, `sign-up`, `password/forgot`, `password/reset` | Directive is **Google only**. These endpoints are dropped. The UI screens (`SignUpScreen`, `ForgotPasswordForm`, `ResetPasswordForm`, `app/auth/*`) are no longer in the launch scope and need a product decision (hide, remove, or park) in B2 (DR-11) |
| 2 | Paths under `/api/...` and a configurable `NEXT_PUBLIC_API_BASE_URL` (cross-origin backend) | New contract is `/api/v1/...` and **same-origin** initially; the configurable base URL remains for the future extraction |
| 3 | `POST /api/assessments` takes one `{questionId, answerId}` and returns correctness | New model separates `assessments` (definition), `attempts`, and per-question `answers`, with immutable `question_versions`; `AssessmentAttempt` in the UI (aggregate `correct`/`total`) becomes a derived read model |
| 4 | `PUT /api/me/preferences` (one object) | Split into app preferences and learning preferences (directive C13) |
| 5 | Material `status` is `uploaded/processing/ready/failed`; upload is multipart to the API | Richer state model; uploads go straight to R2 via presigned URL; the API never proxies file bytes |
| 6 | Tutor returns `{ text, source: "gemini", conceptId }` | Response must carry labelled `segments` and verified `sources` so grounded and general knowledge are distinguishable; `source` per segment |
| 7 | `GET /api/subjects/:id/map` returns `{ concepts, learner }` | Add `prerequisites`, provenance/review fields, `revision`, and `policyVersion`; keeps graph and learner data as separate lists (**kept**, matches A2) |
| 8 | `GET /api/progress` returns `AssessmentAttempt[]` with `takenAt` | Kept in spirit; derived from `attempts`/`answers` with real timestamps |
| 9 | `GET /api/history` completed activities only; recommendations never in history | **Kept** unchanged |
| 10 | Frontend `lib/auth/api.ts` reads per-path env overrides (`NEXT_PUBLIC_AUTH_*_PATH`) | Will be reduced to the Google start and `GET /me` calls in B2 |
