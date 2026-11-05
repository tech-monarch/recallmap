# Changelog

## 2026-11-04: B0 engineering foundation (code and configuration)
- **Security:** `next` 16.3.8 -> 16.4.5 (affected by two critical RCE advisories and one high DoS advisory). `npm audit`: 23 findings (1 critical) -> 13 (0 high, 0 critical); production dependencies 0.
- **Tooling:** ESLint 8 -> 9.39.5, `eslint-config-next` 14 -> 16.4.5; `npm run lint` now runs (exit 0, 1 warning). Fixed `useIsMobile` (`react-hooks/set-state-in-effect`) using `useSyncExternalStore`; removed a stale `eslint-disable`.
- **Build:** fonts self-hosted (`app/fonts/`, `next/font/local`); production build passes without Google network access.
- **Dependencies removed:** `recharts`, `react-hook-form`, `@hookform/resolvers`, `@google/genai`, `framer-motion`, `react-icons`; deleted two unrendered components (`ScrollToTop`, `DiagonalLines`). `shadcn` moved to devDependencies.
- **Repository:** removed nested `recallmap.zip`; `.gitignore` now tracks `.env.example` and ignores `*.zip`; added `.gitattributes` (LF); removed unused `/sw.js` header rules from `next.config.ts`.
- **Docs:** corrected `HANDOFF.md` and `MILESTONE_STATUS.md`; resolved KI-01..06, 14, 15; added ER-002 test report; DR-01 marked resolved.
- **No database, API, authentication or feature changes. No breaking changes.** Tests: typecheck, 116 tests, lint, build and a start-server smoke test all pass.

## 2026-11-04: Planning and documentation (B0 inspection, no code changes)
- Added architecture, schema, API, AI/document pipeline, learner-state policy, security, deployment, compliance, testing, roadmap, and decision-register documents reflecting the owner's approved Master Directive (A-G) and the S1/S2/S3, worker/queue, and GitHub decisions.
- Recorded the engineering baseline (typecheck pass, 116 tests pass, lint broken, build blocked by sandbox network, `npm audit` critical Next.js advisory).
- Marked `docs/ARCHITECTURE.md` and `docs/API_CONTRACTS.md` as partly superseded.
- **No application code, dependencies, migrations, or configuration were changed.**
- Commit `e7208012` pushed to `origin/main`; status file corrected in a follow-up docs-only commit.

## 2026-10-26 (earlier history, from repository log)
- Initial commits: frontend prototype through milestone 5/6 (see `HANDOFF.md`, `MILESTONE_STATUS.md`).
