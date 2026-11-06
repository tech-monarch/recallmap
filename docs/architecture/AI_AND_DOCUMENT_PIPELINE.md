# RecallMap: AI Integration and Document Processing

**Status: approved decisions + PROPOSED design. Not implemented.** The only AI-related code today is the demo tutor (`lib/recallmap/demo-tutor.ts`, labelled `source: "demo"`). Last updated 2026-11-04.

## 1. Gemini providers and credentials

### 1.1 Facts and assumptions

- **Approved (owner, 2026-11-04):** `GEMINI_API_KEY_PRIMARY` is the owner's credential. `GEMINI_API_KEY_SECONDARY` belongs to **another person** who independently manages it. The secondary is a conditional fallback, disabled until all verification gates pass.
- **Documented by Google (checked 2026-11-04):** rate limits are applied **per project, not per API key**, are tied to the project's usage tier, and spend-based limits also return `429 RESOURCE_EXHAUSTED`. Source: `https://ai.google.dev/gemini-api/docs/rate-limits`. Therefore different owners *probably* mean different quota pools, but project separation, tier, billing and quotas **must be verified, not assumed** (gate G2/G3).
- **Verified 2026-11-05 (Google's terms, effective March 23, 2026):** unpaid quota content may be used to improve Google products and reviewed by humans; paid (billing-enabled project) content is not used to improve products. **Also: the terms prohibit using the Services in an application directed at or likely to be accessed by under-18s (`FEASIBILITY_VERIFICATION.md` F1, DR-18). This applies to both keys and every task, and is unresolved.**
- **Unverified:** whether either key's project is on a paid tier (owner will verify, DR-02), and whether each key type remains supported. These are open items, not assumptions.

### 1.1a Owner decision on DR-18 (2026-11-05)
Gemini Developer API is used for **development and testing with synthetic data only**; no real learner or minors' data until the contractual and privacy issues are resolved; the integration stays provider-independent (`AiProvider` interface); billing, another key, or Vertex AI are not assumed to resolve the age restriction. `AI_DATA_MODE=synthetic|real` is the technical guard (`docs/deployment/FREE_TIER_INFRASTRUCTURE.md` 4.2); the secondary key remains disabled behind G1-G6.

### 1.2 Credential slots

Two independent adapter instances, `primary` and `secondary`. Each has its own key, enable flag, circuit breaker and counters. Keys exist only in the server/worker config module (validated by Zod), never in `NEXT_PUBLIC_*`, client bundles, logs, API responses, or the repository.

| Variable | Meaning | Default |
|---|---|---|
| `GEMINI_API_KEY_PRIMARY` | owner's key | required for AI features |
| `GEMINI_API_KEY_SECONDARY` | third party's key | unset |
| `GEMINI_PRIMARY_ENABLED` | switch for primary | `true` |
| `GEMINI_SECONDARY_ENABLED` | switch for secondary; startup refuses `true` without a key and logs an audit event when enabled | `false` |
| `AI_LEARNER_CONTENT_ENABLED` | allows learner-content tasks (see 1.4); set to `true` only after the primary's data terms are verified (DR-02) | `false` in production |
| `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | model names, verified at B1 | none |

Disabling or rotating the secondary is a configuration change only. A test asserts that primary behaviour is identical with the secondary disabled, absent, or revoked. Both keys are independently rotatable and revocable.

### 1.3 Request flow and failure classification

1. Try `primary` with a request timeout.
2. Retry only transient errors: bounded (default 2), exponential backoff with jitter, honouring any server retry delay.
3. Fall back to `secondary` at most **once per request**, only if it is enabled, its breaker is closed, **the task is secondary-eligible (1.4)**, and the failure is eligible.
4. Otherwise return a controlled `ai_unavailable`. Objective grading and reading never depend on AI.

| Failure | Retry primary | Fall back |
|---|---|---|
| 503, timeout, network error | yes, bounded | yes, after retries |
| 429, per-minute rate limit | short backoff | yes, if still failing |
| 429, daily quota or spend limit | no | yes, and open the primary breaker until the quota window resets |
| 400 invalid request, malformed output | no | **no** |
| 401 / 403 authentication or permission | no | **no**; mark slot unhealthy, alert |
| Safety block / refusal | no | **no** (a second key is never a way around a safety decision) |
| Secondary returns 401/403 | n/a | auto-disable secondary until an operator re-enables it |

Circuit breaker per slot: open after N consecutive eligible failures, cool down, half-open probe. Quota-exhaustion opens last until the quota reset (daily limits reset at midnight Pacific per Google's docs, verify), not a fixed few minutes. Never rotate keys to evade quotas or restrictions; fallback is not capacity planning, so budgets and limits are sized against the primary alone.

### 1.4 Task eligibility for the secondary key (owner decision S1)

The secondary may handle **non-personal processing only** until its data-processing terms are verified and explicitly approved. Enforced in code by an `AiTask` registry with a `secondaryEligible` flag; unlisted tasks default to **not eligible**.

| Task | Secondary eligible (Proposed) | Reason |
|---|---|---|
| `concept_extraction`, `graph_proposal` (from document text) | yes (owner's example) | derived from the learner's *document*, not their behaviour |
| `chunk_embedding` (document chunks) | yes | same |
| `question_generation_from_material` | yes | no learner answers or history in the prompt |
| `tutor_reply`, `tutor_query_embedding` | **no** | learner questions are personal |
| `short_answer_grading`, `feedback_generation` | **no** | contains learner-written answers |
| `recommendation_explanation`, personalization using preferences/history | **no** | learner history |
| `misconception_inference` | **no** | learner answers |

Caveat for approval (DR-02): uploaded documents can themselves contain personal data (for example scanned handwritten notes with names). The eligibility list above follows the owner's examples; the owner may want to restrict `concept_extraction` further or add a document-level opt-out. If the primary is unavailable and the task is ineligible, the user sees a clear `ai_unavailable`, not a silent downgrade.

**Learner-content gate (owner decision S2).** Anything involving learner content (tutor, grading, feedback, personalization, recommendations) is blocked in production unless `AI_LEARNER_CONTENT_ENABLED=true`, which is set only after the provider configuration used for that content has acceptable data-processing terms. Staging and development use synthetic data only.

### 1.5 Secondary enablement gates (all six required, owner decision S3)

Recorded with date, evidence and verifier in `docs/compliance/THIRD_PARTY_PROCESSORS.md`. The integration stays disabled until every gate is signed off.

| Gate | Requirement |
|---|---|
| G1 Ownership and authorization | The key owner is identified and gives **written** authorization naming RecallMap and the permitted use |
| G2 Project separation | Owner confirms (screenshot or AI Studio project page) which Google Cloud project/account owns the key and that it differs from the primary's project |
| G3 Tier, billing, quota | Usage tier, billing status, per-model limits for the models RecallMap uses, and model parity with the primary |
| G4 Data terms | The terms and data-use settings that apply to that project are acceptable for the tasks in 1.4 (paid versus unpaid terms matter), recorded in the privacy documentation |
| G5 Permitted use and key type | Current Google terms permit this sharing arrangement (legal review item); the key type and authentication method are currently supported; one low-cost test call per slot succeeds |
| G6 Revocation | A reliable revocation contact, an agreed notice method, and a tested procedure (revoke -> secondary disabled automatically -> alert -> primary unaffected) |

Credential type: the adapter hides how the key authenticates, so a change in supported key types touches one module. Do not assume older key formats will keep working (verify at B1).

### 1.6 Usage tracking and logging

Every call writes `ai_usage` (task, model, **slot**, attempt, fallback yes/no, outcome category, latency, tokens, estimated cost) and a structured log line with `requestId`/`jobId`. No keys, prompts, or document text in logs. Alerts: any fallback use, secondary auth failure, breaker opens, nearing limits. Per-user daily budgets and rate limits are enforced from `ai_usage`.

## 2. Prompting, structured output, and safety

- Prompts live in versioned files (`prompts/<task>/<version>`), each with an owner, input schema, output schema, and evaluation set; model and prompt version are stored on generated content.
- All structured outputs are validated with Zod. Malformed output: one repair retry at most, then fail. Invalid output is never trusted or partially accepted.
- **Prompt injection:** documents and chat text are untrusted data placed in clearly delimited sections; the model has **no tools** that touch the database, secrets, or other users; outputs are data (ids, text) that the server validates (for example a recommendation id must be in the eligible set, a cited chunk id must belong to this learner's subject). Nothing in a document can change instructions, access secrets, or bypass deterministic rules.
- **Minimization:** prompts contain only the concept, its prerequisites, a few relevant chunks, recent mistakes on that concept, and relevant preferences. Never the full history.

## 3. Tutor grounding

1. Retrieve relevant chunks for the question within the learner's own subject (exact cosine search first).
2. The model answers in labelled segments: **grounded** (with chunk ids), **general** knowledge, or **unsupported/uncertain**.
3. The server verifies every cited chunk id belongs to the learner and that quoted spans exist in the stored text; unverifiable citations are dropped and the segment is downgraded to `general`. Document citations are never fabricated.
4. The companion personality (friendly, warm, encouraging, never patronizing; honest about mistakes; never claims to be human; no dependency-building) lives in a versioned system prompt reviewed against an evaluation set that includes "learner states a wrong answer confidently" cases.
5. Tutor output never writes learner state. Misconception guesses are stored as `evidence.is_inferred = true` and ignored by the policy engine.

## 4. Document processing

### 4.1 Storage

Cloudflare R2, private bucket, key `u/{userId}/m/{materialId}/original` (server-generated, never derived from the filename). Presigned PUT URLs: single key, 10-minute expiry, bound to the material. R2 presigned URLs support GET/HEAD/PUT/DELETE only and **not POST policies**, so `content-length-range` is impossible (verified 2026-11-05, `FEASIBILITY_VERIFICATION.md` F5): the signature covers `Content-Type` and the exact `Content-Length` the learner declared; the completion step verifies the real size and type with a HEAD request; the worker re-validates content; an R2 lifecycle rule deletes incomplete/unreferenced objects; the bucket needs a CORS rule for the app origin. Originals are preserved after processing. Extracted artifacts (text, sections) live in the database.

### 4.2 Stages (Proposed state model)

| # | Stage / status | What happens | Failure handling |
|---|---|---|---|
| 1 | `uploaded` | API validated ownership, declared type, size; issued URL; learner uploaded directly | Interrupted upload: material stays `uploaded`; stale ones expire and are cleaned up |
| 2 | verify -> `queued` | `POST /materials/:id/complete` checks the object exists and size matches; enqueues a job with a singleton key | Missing object -> `failed: upload_incomplete`, retryable by re-upload |
| 3 | `processing` / `extracting` | Worker validates magic bytes, structure and limits (page count, decompressed size), then extracts text (PDF text layer, DOCX/PPTX/XLSX native parsers, TXT/MD directly) | Corrupt/unsupported/encrypted/too large -> `failed` with a stable `error_code`; never marked processed |
| 4 | OCR (conditional) | Scanned PDFs and images when text-layer yield is below a threshold per page | OCR failure -> `failed: ocr_failed`; partial OCR is recorded, not hidden |
| 5 | sections + chunks | Heading-aware sections; chunks of roughly 500-800 tokens with small overlap; char offsets and page stored | Transactional per stage; reruns are safe |
| 6 | `embedding` | Batch embeddings with the configured model; stored with model name and dimension | Retries with backoff; provider outage -> failed `ai_unavailable`, retryable |
| 7 | `generating_concepts` | Proposed topics, concepts, descriptions, objectives, prerequisite edges, each with source chunk references and confidence | Output schema-validated; unverifiable sources rejected |
| 8 | `awaiting_review` | Proposals saved with `review_status=proposed`; the learner edits and confirms | Nothing is auto-confirmed; uncertain prerequisite edges stay proposed |
| 9 | `ready` | Set only after required stages succeeded **and** the learner confirmed | - |
| - | `failed` | `failed_stage`, `error_code`, user-visible message, retry and delete actions | Dead-letter queue entry for operators |

### 4.3 Validation and hardening

- Validate extension, declared MIME, **magic bytes**, size, page count, and structure; never trust filenames or declared MIME.
- Reject encrypted/corrupt files. Defend against zip bombs and decompression attacks (limit total uncompressed size and entry count for DOCX/PPTX/XLSX), path traversal in archive entries, embedded macros/scripts (never executed; macro-enabled formats rejected), external references and SSRF through parser features (disable network access in parsers; the worker has no inbound exposure).
- Per-job CPU time, memory and wall-clock limits; one file per job; run extraction in a child process with resource limits where practical (container isolation on the worker host).
- Extracted text is untrusted. Operational logs carry ids, stages, durations and error categories, never document content.

### 4.4 Format plan (all targeted; feasibility verified in B3)

| Format | Approach | Notes |
|---|---|---|
| PDF (text) | text-layer extractor | quality check per page |
| PDF (scanned), PNG, JPG | OCR | **Decision DR-07**: worker-local OCR (for example Tesseract, private but CPU/memory heavy, quality varies) versus Gemini multimodal (better quality, but sends document images to a provider, subject to the S1/S2 rules) |
| DOCX, PPTX, XLSX | native parsers with zip limits | XLSX only where educationally relevant: cells to text with sheet context |
| TXT, Markdown | direct, encoding detection | |
| Pasted text | direct, stored as a material of kind `pasted_text` | |

Provenance is retained end to end: concept -> `concept_sources` -> chunk -> section -> page/offset -> original object.

## 5. Feasibility checks to run in B1/B3 (record source and date for each)

Aiven plan, PostgreSQL version, and pgvector availability; pg-boss compatibility with Aiven connections; R2 presigned upload behaviour and limits; current Gemini model names, structured output, and embedding dimension options; key types and quotas for both slots; Google OAuth setup and PKCE support in the chosen library; graph layout library capabilities; OCR options.
