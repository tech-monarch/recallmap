# Planned API contracts (NOT IMPLEMENTED)
All endpoints require an authenticated session except the auth start/callback. JSON unless noted. Errors: `{ "error": { "code": string, "message": string } }`.

## Auth
- `GET /api/auth/google` → redirects to Google. `GET /api/auth/google/callback?code&state` → sets session, redirects to `/onboarding` (first time) or `/dashboard`.
- `POST /api/auth/signout` → 204.
- `GET /api/me` → `{ id, name, email, avatarUrl, onboarded: boolean, preferences }`.

## Preferences / onboarding
- `PUT /api/me/preferences` ← `{ goals?: string, explanationStyle?: ("examples"|"analogies"|"visual"|"steps")[], explanationDepth?: "brief"|"standard"|"detailed", pace?: "slow"|"normal"|"fast", difficulty?: "gentle"|"standard"|"challenging" }` → updated preferences. All optional.
- `POST /api/me/onboarding/complete` → 204.

## Library
- `GET /api/subjects` → `Subject[]` (`{id,name,description}`). `POST /api/subjects` ← `{name,description?}`. `DELETE /api/subjects/:id`.
- `GET /api/subjects/:id/materials` → `Material[]` (`{id,subjectId,title,kind,status:"uploaded"|"processing"|"ready"|"failed",createdAt}`).
- `POST /api/subjects/:id/materials` multipart (PDF, size limit TBD) or JSON `{title, text}` → `Material` with `status:"processing"`.
- `GET /api/materials/:id` → metadata + extracted sections `{heading, body}[]` when ready.

## Knowledge map (per subject)
- `GET /api/subjects/:id/map` → `{ concepts: Concept[], learner: LearnerConceptState[] }`. Concept graph and learner state are returned as separate lists and stored separately.
- Types: see `lib/recallmap/types.ts`. Inferred evidence carries `confidence: "low"|"medium"|"high"` and must always be presented as unconfirmed. The client reads through `lib/recallmap/knowledge.ts`; replace its data source with this endpoint.

## Tutor
- `POST /api/tutor` ← `TutorRequest` (`lib/recallmap/tutor.ts`: `subjectId, materialId, conceptId|null, mode: answer|simpler|steps|example|analogy, question?`) → `{ text, source: "gemini", conceptId }`. Server selects only relevant context (concept, prerequisites, recent mistakes, preferences, relevant material passages). On both keys unavailable: `503 { error.code: "ai_unavailable" }`; the UI shows a message and everything else keeps working.

## Assessments
- `GET /api/concepts/:id/practice` → questions. `POST /api/assessments` ← `{ questionId, answerId }` → `{ correct, explanation, observed: "incorrect"|"correct", inferredMisconception?: { text, confidence } }` and updates learner state. Grading of multiple choice is local/deterministic and must work with AI down.

## Progress and history (UI built in milestone 5 against `LearnerData` in `lib/recallmap/types.ts`)
- `GET /api/progress?subjectId` → `{ concepts: Concept[], states: LearnerConceptState[], attempts: AssessmentAttempt[] }`. `AssessmentAttempt` = `{ id, conceptId, activityId, kind: "assessment"|"follow-up"|"retention-check", correct, total, takenAt }`. The UI currently orders attempts by an ordinal `sequence`; the API must provide real `takenAt` timestamps (ISO 8601) and the client will sort by them. Never return placeholder or estimated attempts: missing data must be absent, not zero.
- `GET /api/history?subjectId&type&status&cursor` → `{ activities: LearningActivity[], nextCursor? }`. Completed activities only (`status: "completed"`, with `completedAt`). Study sessions may carry `intervention: { kind, note }`; follow-ups carry `followsActivityId`.
- `GET /api/recommendations?subjectId` → `LearningActivity[]` with `status: "recommended"` and a `reason`. Today these are derived client-side (`recommendedActivities` in `lib/recallmap/progress.ts`); the server may take over once it has timestamps for spacing retention checks. Recommendations are never part of history.
- Backend must record, per scored attempt, the concept, question count, correct count and timestamp; progress is computed from these, never from time spent.
