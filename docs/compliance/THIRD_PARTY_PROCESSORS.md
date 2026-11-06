# RecallMap: Third-Party Processors and Gemini Secondary-Key Authorization Record

Last updated 2026-11-04. Entries marked **UNVERIFIED** have not been confirmed against provider terms or the key owners.

## 1. Processors (planned)

| Processor | Purpose | Data involved | Status |
|---|---|---|---|
| Google (sign-in) | Google OAuth | name, email, Google subject id, avatar | planned; terms not yet reviewed |
| Aiven (free plan, Phase 0) | PostgreSQL hosting | **synthetic data only** in Phase 0 | free plan: 1 GB, 20 connections, may power off, no static IPs (verified); region and pgvector support **UNVERIFIED** |
| Cloudflare R2 | private file storage and encrypted backups | uploaded documents, DB exports | planned; terms not reviewed |
| Google Gemini, **primary** key (owner) | AI tasks | task-dependent (see AI doc) | billing tier and data terms **UNVERIFIED** (DR-02, owner will verify) |
| Google Gemini, **secondary** key (a different person) | conditional fallback for non-personal tasks only | document text for concept extraction, document chunks, question generation from material | **DISABLED**; gates G1-G6 open |
| Render (free web service, Phase 0) | execution of the Next.js app and embedded worker | **synthetic data only** in Phase 0 | region and terms not yet recorded |
| Error tracking / monitoring | diagnostics | redacted events | not chosen |

## 2. Secondary Gemini key: enablement checklist (owner decision S3)

The integration **stays disabled** (`GEMINI_SECONDARY_ENABLED=false`) until every row is Passed. Eligible tasks are limited as in `docs/architecture/AI_AND_DOCUMENT_PIPELINE.md` section 1.4 (owner decision S1).

| Gate | Requirement | Status | Evidence | Verified by / date |
|---|---|---|---|---|
| G1 | Owner identified; written authorization naming RecallMap and permitted use | Open | - | - |
| G2 | Google Cloud project/account confirmed, different from primary's project | Open | - | - |
| G3 | Tier, billing, per-model quotas, model parity with primary | Open | - | - |
| G4 | Data-processing terms for that project acceptable for the eligible tasks; documented in privacy policy. Google's published terms (2026-11-05): unpaid quota content may be used to improve products; paid-project content is not | Open | https://ai.google.dev/gemini-api/terms | - |
| G5 | Google terms permit this sharing arrangement (legal review); key type and authentication currently supported; test call per slot passes. **Also blocked by DR-18** (age restriction applies to the whole application) | Open | - | - |
| G6 | Revocation contact, notice method, and tested revoke -> auto-disable -> alert procedure | Open | - | - |

Secondary owner contact and the authorization document are **not** recorded in the repository (they are personal data and a confidential agreement); this file records only that they exist and where they are kept (owner to fill in: private location).

## 3. Primary key verification (owner decision S2)

| Item | Status |
|---|---|
| Project and billing tier | **UNVERIFIED** (owner to verify); **DR-18 (age restriction) applies regardless of tier** |
| Data-use terms applicable to that tier | **UNVERIFIED** |
| `AI_LEARNER_CONTENT_ENABLED` | must stay `false` in production until the two rows above are resolved |

## 4. Synthetic-data rule (owner decision, 2026-11-05)

Until DR-18 and the privacy items are resolved, every environment contains **synthetic data only**: no real learners, no real documents, no real accounts. Enforced procedurally and by `AI_DATA_MODE=synthetic` (`docs/deployment/FREE_TIER_INFRASTRUCTURE.md` 4.2). The Gemini free tier may use submitted content to improve Google products (verified in the terms), which is a second reason for the rule.
