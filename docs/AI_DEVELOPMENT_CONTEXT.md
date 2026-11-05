# RecallMap: AI Development Context (handover for a new Claude session)

Last updated 2026-11-04. Do not trust this file over the code: verify against the repository first.

## Start-of-session checklist
1. Read `PROJECT_CONTEXT.md`, `docs/milestones/CURRENT_STATUS.md`, `docs/milestones/DEVELOPMENT_ROADMAP.md`, `docs/milestones/DECISION_REGISTER.md`.
2. `git status`, `git log --oneline -n 10`; inspect the files the next task touches.
3. Confirm what is actually done; do not assume a planned task was completed.

## Facts
- Repository: `github.com/tech-monarch/recallmap` (public), default branch `main`. Pushing needs a fine-grained, repo-scoped token supplied through a secure session mechanism. **Never ask for it in chat, never print or commit it.** If the owner pastes one into chat, treat it as exposed and ask them to revoke it.
- Stack today: Next.js 16.3.8, React 19.2.8, TypeScript, Tailwind 4, shadcn/base-ui, Vitest 116 tests. No backend.
- Frontend map: `app/` routes; `components/recallmap/*` views; `lib/recallmap/*` domain types and pure helpers (`types.ts`, `progress.ts`, `history.ts`, `knowledge.ts`, `demo-*.ts`); `lib/auth/api.ts` auth client for a non-existent backend; `tests/` Vitest.
- Known frontend traps: map positions are hardcoded per demo concept id (`DEMO_MAP_LAYOUT`); `knowledge.ts` reads demo constants directly while Progress/History use `LearnerData` + `isDemo`; the Drawer has no focus trap; `reset-password/page.tsx` uses legacy hardcoded colours; fonts load from Google at build time.

## Approved decisions to respect
See `PROJECT_CONTEXT.md` principles and `docs/architecture/SYSTEM_ARCHITECTURE.md` section 1. Do not silently change them. Unapproved: learner-state thresholds, hosting, embedding model, OCR approach, graph layout libraries (see the decision register).

## Rules of engagement
- Planning stage: no backend code, migrations, auth implementation, or frontend rewrites before the owner approves the blueprint.
- Never claim a test passed, a push happened, or a ZIP exists unless verified in this session.
- Gemini: keys are server-only; primary first; secondary only for eligible tasks and transient errors, and only after gates G1-G6; never log key material.
- After every completed update: check, review for secrets, commit, push (if credential exists), create and verify a ZIP (exclude `node_modules`, `.next`, `.git`, `.env*` except `.env.example`, caches, nested ZIPs), record commit and ZIP in `CURRENT_STATUS.md`.
- Docs must say Planned/Proposed/Implemented truthfully; no invented endpoints, tables, or results.
