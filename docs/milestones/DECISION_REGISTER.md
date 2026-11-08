# RecallMap: Outstanding Decision Register

> **Update 2026-11-05.** Owner decisions recorded: DR-03 (Aiven free plan), DR-05 (Render free tier), DR-18 (continue with Gemini Developer API using synthetic data only; remains a production compliance blocker), DR-02 (billing still unverified, owner will check). New: DR-19 to DR-23. Details: `docs/deployment/FREE_TIER_INFRASTRUCTURE.md`.

Decisions already settled by the owner (Master Directive A-G and the 2026-11-04 clarifications: S1, S2, S3, worker/queue, GitHub auth) are **not** listed. Classification: **Blocking** (needed before implementation starts), **Milestone-specific**, **Deferred**, **Optional**. Last updated 2026-11-04.

## Blocking

### DR-01 B0 hygiene changes: **RESOLVED 2026-11-04** (owner said "begin"; applied as recommended)
> Outcome: (a) Next 16.4.5, (b) ESLint 9 + eslint-config-next 16, (c) fonts self-hosted, (d) nested zip removed and `*.zip` ignored, (e) `.gitattributes` added, (f) `.env.example` tracked, (g) unused dependencies removed after re-verification. **Correction:** `shadcn` was proposed for removal but is imported by `app/globals.css`, so it moved to devDependencies instead; `cn` is the official shadcn-ui package and stays. Evidence: `docs/testing/TEST_EXECUTION_REPORT.md` ER-002. The original text follows for the record.

- **Decide:** approve these repository changes: (a) upgrade `next` to a patched version (registry latest is 16.4.5; confirm compatibility); (b) fix lint by moving **forward** (ESLint 9 + `eslint-config-next` 16.x matching Next, not downgrading the config); (c) self-host the three fonts with `next/font/local` so builds do not need Google at build time and visitors do not hit Google Fonts; (d) remove the redundant `recallmap.zip` from the repository (history keeps it) and ignore `*.zip`; (e) add `.gitattributes` (`* text=auto eol=lf`) to stop CRLF churn; (f) track `.env.example` (fix the `.env*` ignore pattern); (g) remove genuinely unused dependencies after re-verifying (`zod` is **kept**, it is now required).
- **Why:** audit baseline found a critical advisory on the installed Next version, a broken lint, a network-dependent build, and repository hygiene issues.
- **Approaches:** apply all in one B0 update (recommended), or only (a),(b),(f) first.
- **Recommendation:** all, as separate small commits, each with tests/typecheck re-run; font change is visual-neutral if the same font files are used.
- **Consequences:** skipping (a) leaves a deployed app on a version with published critical advisories (the code paths appear unused here, but that is not verified for a deployed instance).

### DR-02 AI data terms and tier (Blocking for any learner-content AI feature; **OPEN**: owner has not yet confirmed whether the primary project has billing enabled)
- **Decide:** (1) the owner verifies the primary key's project, billing tier and data-use terms; (2) approve the **secondary-eligible task list** in `AI_AND_DOCUMENT_PIPELINE.md` 1.4, including whether `concept_extraction` on uploaded documents remains eligible given documents may contain personal data (optional per-document opt-out).
- **Why:** **verified 2026-11-05:** Google's terms say unpaid-quota content is used to improve products and may be read by human reviewers, with a warning not to submit sensitive or personal information; paid (billing-enabled project) content is not used to improve products. Learner content may include minors' data. See also DR-18.
- **Approaches:** billed project for learner content (recommended); or restrict AI to non-personal tasks until resolved.
- **Consequences:** until resolved, `AI_LEARNER_CONTENT_ENABLED=false` in production, so the tutor and grading stay off there (staging uses synthetic data).

### DR-03 Infrastructure feasibility: **DECIDED 2026-11-05: start on Aiven's free PostgreSQL plan; verification pending** (blocking only for pgvector-dependent work in B3)
> Outcome: free-plan facts documented (1 GB disk, 20 connections, no pooling, may power off when idle, no static IPs); simulation shows Drizzle, pgvector and pg-boss work within those limits; **pgvector on the free plan itself is unverified until the owner runs the acceptance test** (`docs/deployment/SETUP_GUIDE.md` 7.3). No paid plan may be purchased without approval. Original text follows.
- **Decide/verify:** Aiven plan and PostgreSQL version support pgvector and the privileges to create extensions and the `pgboss` schema; connection limits; pg-boss compatibility and direct-connection behaviour; R2 presign and limits.
- **Approaches:** verify against live documentation and a scratch database; fall back to a different Postgres host or a different queue only if a check fails (Redis only if pg-boss is demonstrably unsuitable).
- **Recommendation:** run the checks first in B1 and record sources and dates.
- **Consequences:** a failed check changes B1 scope; no schema work starts before it passes.

### DR-05 Hosting for web and worker: **DECIDED 2026-11-05: Render free tier initially; persistent worker is NOT available free (see DR-21)**
> Outcome: free web service spins down after 15 minutes idle; free instances are not available for Background Workers or Cron Jobs. Cheapest workaround: embedded worker in the web process for cloud development plus a local standalone worker for heavy jobs; first paid step if needed is the Render Starter web service. Original text follows.
- **Decide:** where Next.js runs (serverless versus persistent host) and where the persistent worker runs.
- **Approaches:** (1) Next.js on a serverless host plus a small always-on worker host (cheap, needs strict DB pool limits and a pooler); (2) both on one persistent host or container platform (simpler connections and one deployment, no serverless limits); (3) managed container service for both.
- **Recommendation:** (2) for the first release unless you already operate a serverless deployment you want to keep; it avoids connection-pool surprises and lets the worker share the runtime.
- **Consequences:** drives connection budgeting, cost, deployment pipeline, and cookie/domain setup.

### DR-18 Gemini API age and consumer-use restrictions: **PARTIALLY DECIDED 2026-11-05; remains a production compliance blocker**
> Owner decision: keep using the Gemini Developer API for **development, experimentation and testing with synthetic data only**; continue building tutor, graph generation, question generation and document understanding; **no real learner information, identifiable student data or minors' educational content** while the contractual and privacy issues are unresolved; keep the AI integration provider-independent; continue investigating Google's terms and alternatives. The audience stays secondary-school students, independent candidates and other learners (**not** adults-only). Enabling billing, using another key, or switching to Vertex AI are **not** assumed to resolve the age restriction. Technical guard: `AI_DATA_MODE` (`docs/deployment/FREE_TIER_INFRASTRUCTURE.md` 4.2). Alternatives research: `docs/architecture/TECH_RESEARCH.md` section 5. Original analysis follows.
- **Decide:** how RecallMap complies with Google's Gemini API Additional Terms, which say the Services must not be used in an application directed towards or likely to be accessed by individuals under 18, are for professional/business (not consumer) use, and require paid services for users in the EEA, Switzerland and the UK. Details and sources: `docs/architecture/FEASIBILITY_VERIFICATION.md` F1.
- **Approaches:** (A) make RecallMap an 18+ product with an age gate and adult-only positioning; (B) use Gemini through Google Cloud if its terms permit your audience (to be verified); (C) change or add an AI provider whose terms permit school-age users (needs your approval, the adapter design allows it); (D) ask Google for written clarification.
- **Recommendation:** treat this as blocking for the AI stages (concept extraction, embeddings, tutor, grading) and get qualified legal advice before any of them ship; decide your target learner age first (DR-15). Start with option A or B only after verification. Non-AI B1/B2 work is unaffected.
- **Consequences:** if unresolved, no learner-facing AI can ship on the Gemini Developer API.
- **Update 2026-11-07:** provider research started (`docs/architecture/AI_PROVIDER_COMPARISON.md`, **in progress, not complete**). Verified: the Gemini Developer API restriction; the same prohibition in archived Google Cloud generative-AI preview terms (current Cloud GA terms **not read**); Anthropic's and OpenAI's official guidance both **permit** minor-facing API products with safeguards (AI disclosure, public compliance statement, moderation and similar), which is not the same as being compliant. Data retention/training, DPA/ZDR eligibility, pricing, payment feasibility from Nigeria, embeddings and quality evaluation are still open. This outranks DR-02 (the paid tier fixes data use but does not remove the age clause).

## Milestone-specific

### DR-04 Learner-state thresholds and choices (B6)
- **Decide:** approve or change the v1 draft in `LEARNER_STATE_POLICY.md`, including **Choice A** (below minimum evidence -> Not assessed, versus cap at Partial), **Choice C** (`sessions_demo`: 2, 1, or none), and the numbers.
- **Recommendation:** A, keep `sessions_demo = 2`, run in shadow mode on real data before finalizing.
- **Consequences:** shapes every progress screen; changing later is a versioned recompute, not a rewrite.

### DR-06 Embedding model and dimension (B3) (Phase 0 default: 768 dimensions)
- **Verified 2026-11-05:** `gemini-embedding-2` (multimodal, 8,192-token input) and `gemini-embedding-001` (text, 2,048 tokens); dimensions 128-3072, recommended 768/1536/3072; the models' spaces are incompatible. Depends on DR-18 (whether Gemini can be used at all).
- **Recommendation:** `gemini-embedding-2` at 768 or 1536 dimensions if Gemini remains the provider; store model and dimension on each chunk; start with exact search.

### DR-07 OCR approach (B3)
- **Approaches:** worker-local OCR (private, heavier, quality varies) versus Gemini multimodal (quality, but sends images to a provider; subject to DR-02) versus a dedicated OCR API.
- **Recommendation:** text-layer extraction first; evaluate local OCR on a sample of real scanned notes before choosing; do not route scanned pages through the secondary key.

### DR-08 Graph layout libraries (B4)
- **Recommendation (updated 2026-11-05):** prototype `@dagrejs/dagre` (hierarchical, maintained, MIT) and `d3-force` (dynamic) with `@xyflow/react` as an optional renderer; `elkjs` is capable but EPL/GPL licensed; the old `dagre` package is unmaintained. Pick on keyboard accessibility, touch, bundle size; no custom engine.

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

## Added 2026-11-05

### DR-19 OAuth/session library (B2): **APPROVED 2026-11-07 (Arctic), with conditions; verification results in `docs/architecture/TECH_RESEARCH.md` 1a**
> Conditions recorded: Authorization Code + PKCE + state; **ID tokens must be verified server-side with `jose`** (Arctic's `decodeIdToken` does not verify anything); opaque hashed sessions with expiry, rotation and revocation; ownership enforced in services and repositories; Google only. Open B2 verification: Google's live `jwks_uri`, `jose` engines and maintenance, clock skew. Original text follows.
- **Approaches:** Arctic + our own session layer; Better Auth; Auth.js; hand-rolled.
- **Recommendation:** Arctic 3.x with our own opaque hashed DB sessions (framework-independent, supports revocation, matches the approved session design). Auth.js is in security-patch mode per third-party reports and its DB sessions fit poorly with Next 16's proxy. Details: `docs/architecture/TECH_RESEARCH.md` section 1.
- **Consequences:** more code we own (session table, rotation, revocation) but no framework schema to adopt.

### DR-20 Node runtime version (B1a): **APPROVED 2026-11-07: Node 24 LTS; pinned and verified**
> Pinned in `.nvmrc` and `engines` (`>=24.0.0 <25`); CI workflow reads `.nvmrc`. Render supports Node 24 (docs verified). Typecheck, lint, 185 tests, 34 database tests and the production build passed on Node 24.22.2 (ER-004). Document-processing libraries to be re-verified in B3; if any has a Node 24 issue it will be documented before the runtime decision is revisited. Original text follows.
- **Decide:** the Node version for local, CI and Render.
- **Facts:** pg-boss needs 22.12+; `pdfjs-dist` 22.13+ or 24; `unpdf` needs 24; `officeparser` has strict patched ranges.
- **Recommendation:** Node 24 LTS, pinned in `engines` and `.nvmrc`, after confirming Render honours `NODE_VERSION` and CI passes on it. The audit sandbox has Node 22.23.4.

### DR-21 Worker mode on the free tier (B1a): **APPROVED 2026-11-07 for development, with limitations; implemented in B1a**
> `WORKER_MODE=embedded|standalone|off`; embedded starts once per process; at least two consumers; signal-aware handlers; idempotent, resumable jobs; heartbeat-based status so the UI never implies a sleeping worker finished a job; local standalone worker for heavy tasks. **Not production background processing.** Original text follows.
- **Decide:** approve `WORKER_MODE=embedded|standalone|off`, with `embedded` as the Render-free default and a local `standalone` worker for heavy jobs.
- **Why:** Render free instances cannot be Background Workers and a free web service sleeps after 15 idle minutes.
- **Recommendation:** approve. Handlers must be idempotent, honour `job.signal`, run with at least two consumers, and development caps (5 MB, 20 pages) protect the small free instance. First paid step if unreliable: Render Starter web service (about $7/month, third-party figure).
- **Consequences:** scheduled jobs (backups, revision scan) do not run reliably in Phase 0.

### DR-22 Cloudflare R2 activation and payment method (before B1b): **OPEN; official sources conflict, so UNVERIFIED**
> Owner instruction (2026-11-07): do not add a card or authorize any payment without explicit approval. Findings: Cloudflare's product page says no credit card required; the current R2 get-started page says only that R2 is free to get started; an older cached docs copy said R2 must be purchased before the first bucket; third-party tutorials say a card is requested for verification. Exact dashboard steps for you are in `docs/deployment/SETUP_GUIDE.md` section 4. Nothing in the repository needs R2 yet. Original text follows.
- **Decide:** whether you are willing to add a payment method if R2 requires one even for the free allowance (10 GB, 1M writes, 10M reads, free egress; overage billed).
- **Status:** Unverified whether it is required. Recommendation: check in the Cloudflare dashboard, tell me the answer, and add no card without deciding. Fallback for development: fakes or a local S3-compatible store until B3.

### DR-23 Document extraction and OCR stack (B3)
- **Recommendation:** `file-type` for magic bytes, `pdfjs-dist` (or `unpdf` on Node 24) for PDF text, `mammoth` for DOCX, evaluate `officeparser`, avoid the stale npm `xlsx`, run local OCR (`tesseract.js` or equivalent) only in a local/standalone worker. Details and licences: `docs/architecture/TECH_RESEARCH.md` section 3. Depends on DR-20 and DR-07.
