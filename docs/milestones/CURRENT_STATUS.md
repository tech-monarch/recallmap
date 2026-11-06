# RecallMap: Current Status

Last updated 2026-11-04.

- **Milestone:** B0 (engineering foundation): **complete**. B1 (infrastructure and application foundation) is **not started** and waits for owner answers to DR-03 (Aiven/pgvector/pg-boss/R2 feasibility) and DR-05 (hosting).
- **Base:** planning blueprint pushed earlier (`e7208012`, `95274908`). B0 code commits (oldest first): `b93d01f` hygiene, `e115fdd` Next/ESLint upgrade, `9e3a087` lint fixes, `4a72ead` dependency cleanup, `0be1b0f` self-hosted fonts, then a docs reconciliation commit. The exact final commit hash and ZIP name are in `MANIFEST.txt` inside the delivered ZIP.
- **Push status:** recorded in the handoff message and the manifest after the push is verified with `git ls-remote`. The tokens used were pasted into chat and are considered exposed: the owner must revoke them and use a secure credential mechanism for later sessions.
- **Tests executed 2026-11-04 (ER-002):** `tsc` pass; Vitest 12 files / 116 tests pass; ESLint exit 0 (0 errors, 1 warning); `next build` pass (Next 16.4.5, 17 pages); `next start` smoke test pass (HTTP level); `npm audit`: 13 low/moderate in dev tooling, 0 high/critical, 0 in production dependencies. Not executed: browser/visual checks, e2e, security suites, accessibility.
- **Known issues:** `docs/KNOWN_ISSUES.md` (open: KI-07..13, 16..19).
- **B1 feasibility pre-work (2026-11-05, documentation only):** `docs/architecture/FEASIBILITY_VERIFICATION.md`. New **blocking** decision DR-18 (Gemini age restriction) for any AI feature; R2 upload design corrected.
- **Infrastructure direction (2026-11-05):** Aiven free + Render free + R2 free allowance, Gemini with synthetic data only (see `docs/deployment/FREE_TIER_INFRASTRUCTURE.md`). Simulation ER-003 passed with observations; the real Aiven acceptance test is **planned, owner to run**. B1 is split into B1a (safe now) and B1b (needs owner actions).
- **Blockers for B1:** DR-03 (needs your Aiven plan details), DR-05; **DR-18 for AI stages**; DR-02 blocks learner-content AI features in production (owner verifying primary key billing/terms); secondary Gemini key gates G1-G6 open.
- **Next exact actions:** (1) owner revokes the pasted tokens and sets up a secure credential mechanism; (2) owner answers DR-05 (hosting) and approves starting B1 feasibility checks (DR-03); (3) begin B1.

## Delivery log

| Date | Update | ZIP | Commit | Verified |
|---|---|---|---|---|
| 2026-11-04 | Planning documents | `RecallMap_2026-11-04_B0_Planning_Docs_1.zip` | `e7208012` (pushed) | integrity + secret scan |
| 2026-11-04 | Status correction | `RecallMap_2026-11-04_B0_Planning_Docs_2.zip` | `95274908` (pushed) | integrity + secret scan |
| 2026-11-04 | B0 engineering foundation | `RecallMap_2026-11-04_B0_Engineering_Foundation.zip` | `566579c` (pushed) | integrity + secret scan |
| 2026-11-05 | B1 feasibility documents | `RecallMap_2026-11-05_B1_Feasibility_Docs.zip` | `b0e7a52` (pushed) | integrity + secret scan |
| 2026-11-05 | Free-tier infrastructure planning | `RecallMap_2026-11-05_B1_FreeTier_Infrastructure_Plan.zip` | see MANIFEST.txt | see handoff message |
