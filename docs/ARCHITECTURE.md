# Backend architecture

## Intended
| Concern | Decision |
|---|---|
| Frontend | Existing Next.js (App Router) + Tailwind + shadcn/base-ui. Unchanged. |
| Backend/API | Next.js Route Handlers (`app/api/*`) in this same project. No separate framework introduced. If a standalone service is needed later, the contracts in `API_CONTRACTS.md` stay the same. |
| Auth | Google OAuth through the backend. Recommended library: Auth.js (NextAuth) Google provider with database sessions. NOT installed yet. |
| Database | PostgreSQL. Access layer (plain `pg` or Drizzle) to be chosen when implemented; no ORM added yet. |
| AI | Gemini, server-side only. `GEMINI_API_KEY_PRIMARY` first; `GEMINI_API_KEY_SECONDARY` only on recoverable quota/rate-limit/availability errors; no duplicate requests, no retry loops, graceful message when both fail. Model from `GEMINI_MODEL`. Verify current model and free-tier limits at implementation time. |
| Storage | `lib/storage` interface (`put/get/delete/signedUrl`) with `local` and `s3` providers chosen by `STORAGE_PROVIDER`. Not implemented yet. |

## Currently implemented (as of milestone 5)
- Frontend only. Every feature uses **local demo data** held in React state. The one exception: Preferences are saved to this browser's `localStorage` (key `recallmap.preferences.v1`), not to a server. There is no backend, no database, no auth, no storage, no AI call.
- `lib/recallmap/tutor.ts` is the single client boundary for tutoring (`askTutor`). It returns canned text tagged `source: "demo"`.
- `components/auth/SignInScreen.tsx` is a UI-only Google sign-in screen; it never signs anyone in.

## Supabase
Removed completely in milestone 3. Checked with a repository-wide search (excluding `node_modules` and lockfile history): zero references in code, config, env examples or docs other than this section. Packages `@supabase/ssr` and `@supabase/supabase-js` removed from `package.json`/lockfile. Replacements:
- Email/password sign-in, sign-up, forgot/reset password and `/auth/callback` → removed (not part of the Google-only plan). Replacement: Google OAuth endpoints in `API_CONTRACTS.md`.
- Sidebar user lookup (`profiles` table) → now shows "Guest" until `GET /api/me` exists.
- `profiles` table → will become `users` + `learner_preferences` tables in PostgreSQL.
- `lib/auth/safe-redirect.ts` is kept for the future OAuth callback `next` parameter.

## Suggested tables (for the backend milestone)
users, learner_preferences, subjects, materials (metadata + storage key + processing status), concepts, concept_prerequisites (graph, per subject, learner-independent), learner_concept_states + evidence (learner-specific), assessment_attempts, study_sessions, session_messages.
