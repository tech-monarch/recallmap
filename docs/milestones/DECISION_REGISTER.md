# RecallMap: Outstanding Decision Register

Decisions already settled by the owner (Master Directive A-G and the 2026-11-04 clarifications: S1, S2, S3, worker/queue, GitHub auth) are **not** listed. Classification: **Blocking** (needed before implementation starts), **Milestone-specific**, **Deferred**, **Optional**. Last updated 2026-11-04.

## Blocking

### DR-01 B0 hygiene changes: **RESOLVED 2026-11-04** (owner said "begin"; applied as recommended)
> Outcome: (a) Next 16.4.5, (b) ESLint 9 + eslint-config-next 16, (c) fonts self-hosted, (d) nested zip removed and `*.zip` ignored, (e) `.gitattributes` added, (f) `.env.example` tracked, (g) unused dependencies removed after re-verification. **Correction:** `shadcn` was proposed for removal but is imported by `app/globals.css`, so it moved to devDependencies instead; `cn` is the official shadcn-ui package and stays. Evidence: `docs/testing/TEST_EXECUTION_REPORT.md` ER-002. The original text follows for the record.

- **Decide:** approve these repository changes: (a) upgrade `next` to a patched version (registry latest is 16.4.5; confirm compatibility); (b) fix lint by moving **forward** (ESLint 9 + `eslint-config-next` 16.x matching Next, not downgrading the config); (c) self-host the three fonts with `next/font/local` so builds do not need Google at build time and visitors do not hit Google Fonts; (d) remove the redundant `recallmap.zip` from the repository (history keeps it) and ignore `*.zip`; (e) add `.gitattributes` (`* text=auto eol=lf`) to stop CRLF churn; (f) track `.env.example` (fix the `.env*` ignore pattern); (g) remove genuinely unused dependencies after re-verifying (`zod` is **kept**, it is now required).
- **Why:** audit baseline found a critical advisory on the installed Next version, a broken lint, a network-dependent build, and repository hygiene issues.
- **Approaches:** apply all in one B0 update (recommended), or only (a),(b),(f) first.
- **Recommendation:** all, as separate small commits, each with tests/typecheck re-run; font change is visual-neutral if the same font files are used.
- **Consequences:** skipping (a) leaves a deployed app on a version with published critical advisories (the code paths appear unused here, but that is not verified for a deployed instance).

### DR-02 AI data terms and tier (Blocking for any learner-content AI feature; unresolved by design)
- **Decide:** (1) the owner verifies the primary key's project, billing tier and data-use terms; (2) approve the **secondary-eligible task list** in `AI_AND_DOCUMENT_PIPELINE.md` 1.4, including whether `concept_extraction` on uploaded documents remains eligible given documents may contain personal data (optional per-document opt-out).
- **Why:** free/unpaid tiers may allow Google to use submitted content to improve products; learner content may include minors' data.
- **Approaches:** billed project for learner content (recommended); or restrict AI to non-personal tasks until resolved.
- **Consequences:** until resolved, `AI_LEARNER_CONTENT_ENABLED=false` in production, so the tutor and grading stay off there (staging uses synthetic data).

### DR-03 Infrastructure feasibility (Blocking for B1)
- **Decide/verify:** Aiven plan and PostgreSQL version support pgvector and the privileges to create extensions and the `pgboss` schema; connection limits; pg-boss compatibility and direct-connection behaviour; R2 presign and limits.
- **Approaches:** verify against live documentation and a scratch database; fall back to a different Postgres host or a different queue only if a check fails (Redis only if pg-boss is demonstrably unsuitable).
- **Recommendation:** run the checks first in B1 and record sources and dates.
- **Consequences:** a failed check changes B1 scope; no schema work starts before it passes.

### DR-05 Hosting for web and worker (Blocking for B1)
- **Decide:** where Next.js runs (serverless versus persistent host) and where the persistent worker runs.
- **Approaches:** (1) Next.js on a serverless host plus a small always-on worker host (cheap, needs strict DB pool limits and a pooler); (2) both on one persistent host or container platform (simpler connections and one deployment, no serverless limits); (3) managed container service for both.
- **Recommendation:** (2) for the first release unless you already operate a serverless deployment you want to keep; it avoids connection-pool surprises and lets the worker share the runtime.
- **Consequences:** drives connection budgeting, cost, deployment pipeline, and cookie/domain setup.

## Milestone-specific

### DR-04 Learner-state thresholds and choices (B6)
- **Decide:** approve or change the v1 draft in `LEARNER_STATE_POLICY.md`, including **Choice A** (below minimum evidence -> Not assessed, versus cap at Partial), **Choice C** (`sessions_demo`: 2, 1, or none), and the numbers.
- **Recommendation:** A, keep `sessions_demo = 2`, run in shadow mode on real data before finalizing.
- **Consequences:** shapes every progress screen; changing later is a versioned recompute, not a rewrite.

### DR-06 Embedding model and dimension (B3)
- **Recommendation:** choose after checking current Gemini embedding models and dimension options; store model and dimension on each chunk; start with exact search.

### DR-07 OCR approach (B3)
- **Approaches:** worker-local OCR (private, heavier, quality varies) versus Gemini multimodal (quality, but sends images to a provider; subject to DR-02) versus a dedicated OCR API.
- **Recommendation:** text-layer extraction first; evaluate local OCR on a sample of real scanned notes before choosing; do not route scanned pages through the secondary key.

### DR-08 Graph layout libraries (B4)
- **Recommendation:** evaluate `elkjs`/`dagre` for hierarchical and `d3-force` or Cytoscape/React Flow for dynamic on correctness, keyboard accessibility, touch, bundle size; pick established libraries, no custom engine.

### DR-09 Curriculum template authoring (B3)
- **Decide:** who creates shared templates (seed data by you, admin UI, community, AI-assisted drafts reviewed by you) and which boards/systems ship first.
- **Recommendation:** seed a small set by script with an operator-only path; no learner authoring of shared templates; no admin UI until needed.

### DR-10 Relationship types (B4)
- **Recommendation:** ship `prerequisite` only; keep `related` in the schema for the dynamic layout later.

### DR-11 Fate of email/password screens (B2)
- **Approaches:** hide (keep code parked), delete, or keep for a later release.
- **Recommendation:** remove from navigation and routes for launch, keep the code in a clearly marked parked folder or in Git history; delete the dead env variables.

### DR-12 Frontend data-access library (B3)
- **Approaches:** TanStack Query, SWR, or plain `fetch` + context; with the `DataSource` interface in all cases.
- **Recommendation:** TanStack Query (cache invalidation after attempts, optimistic updates, retry control), added only when B3 needs it.

### DR-13 Operator access and incident contacts (B8)
- **Decide:** who is the operator/administrator, how operator endpoints are allowlisted, who receives alerts.

## Deferred / optional

### DR-14 Target markets beyond Nigeria
- **Why:** determines GDPR/COPPA-type obligations. Recommendation: decide before marketing outside Nigeria; counsel review.

### DR-15 Minors and onboarding fields
- **Decide:** minimum age, guardian consent approach, and whether onboarding collects age or only education level.
- **Recommendation:** collect education level, not date of birth, unless counsel requires age; legal review before launch to school-age users. Blocks the child safety page, not B1.

### DR-16 Legal counsel (Deferred to B2 start)
- **Decide:** who reviews the legal pages and the Nigerian data protection obligations. Without review no compliance claim may be made.

### DR-17 Optional: gamification
- Out of scope per directive (never a substitute for evidence-based progress). Revisit only as supplementary analytics.
