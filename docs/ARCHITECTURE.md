# Backend architecture

## Intended
| Concern | Decision |
|---|---|
| Frontend | Existing Next.js (App Router) + Tailwind + shadcn/base-ui. Unchanged. |
| Backend/API | Next.js Route Handlers (`app/api/*`) in this same project. No separate framework introduced. If a standalone service is needed later, the contracts in `API_CONTRACTS.md` stay the same. |
| Auth | Google OAuth and email/password through the configurable backend API in `docs/API_CONTRACTS.md`. No auth backend is implemented yet. |
| Database | PostgreSQL. Access layer (plain `pg` or Drizzle) to be chosen when implemented; no ORM added yet. |
| AI | Gemini, server-side only. `GEMINI_API_KEY_PRIMARY` first; `GEMINI_API_KEY_SECONDARY` only on recoverable quota/rate-limit/availability errors; no duplicate requests, no retry loops, graceful message when both fail. Model from `GEMINI_MODEL`. Verify current model and free-tier limits at implementation time. |
| Storage | `lib/storage` interface (`put/get/delete/signedUrl`) with `local` and `s3` providers chosen by `STORAGE_PROVIDER`. Not implemented yet. |

## Currently implemented (as of milestone 5)
- Frontend only. Every feature uses **local demo data** held in React state. The one exception: Preferences are saved to this browser's `localStorage` (key `recallmap.preferences.v1`), not to a server. There is no backend, no database, no auth, no storage, no AI call.
- `lib/recallmap/tutor.ts` is the single client boundary for tutoring (`askTutor`). It returns canned text tagged `source: "demo"`.
- Auth pages use `lib/auth/api.ts` to call a configurable backend. With no API URL configured, requests report that auth is disconnected; no local or demo response is used.

## Authentication integration status
- Sign-in, sign-up, password recovery/reset, and Google OAuth UI are wired to configurable endpoint mappings, but require the backend contract in `docs/API_CONTRACTS.md`.
- Password reset links must open `/auth/reset-password?token=...`; the frontend does not exchange provider codes or manage auth sessions itself.
- Sidebar user lookup currently shows "Guest" until `GET /api/me` is implemented.
- User and preference records are planned for the `users` and `learner_preferences` tables in PostgreSQL.
- `lib/auth/safe-redirect.ts` remains a general same-origin redirect validator for future use.

## Suggested tables (for the backend milestone)
users, learner_preferences, subjects, materials (metadata + storage key + processing status), concepts, concept_prerequisites (graph, per subject, learner-independent), learner_concept_states + evidence (learner-specific), assessment_attempts, study_sessions, session_messages.
