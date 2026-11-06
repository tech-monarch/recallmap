# RecallMap: Technology Feasibility Verification (B1 pre-work)

Verified **2026-11-05** against official documentation read that day. Items not listed here, or marked **Not verified**, have not been checked. This is not legal advice. Re-verify before each milestone that depends on an item (provider terms and model names change).

## 1. Summary

| # | Item | Result | Effect on the design |
|---|---|---|---|
| F1 | **Gemini API terms: age and consumer-use restrictions** | **Blocking risk found** | RecallMap may not be allowed to use the Gemini Developer API if it is directed at, or likely to be accessed by, under-18 learners. New decision **DR-18** |
| F2 | Gemini data use: unpaid versus paid | Confirmed | Unpaid quota: content used to improve products, human review possible, "do not submit sensitive, confidential, or personal information". Paid (project with an active billing account): not used to improve products. Settles the factual part of DR-02 |
| F3 | Gemini availability in Nigeria | Confirmed | Nigeria is on the available-regions list (page updated 2026-10-22) |
| F4 | Gemini embeddings | Confirmed | `gemini-embedding-2` (multimodal, updated April 2026) and `gemini-embedding-001` (text only). Dimensions 128 to 3072 (recommended 768, 1536, 3072); the two models' vector spaces are **incompatible**, so changing models means re-embedding. Input limit 8,192 tokens (v2), 2,048 (v001) |
| F5 | Cloudflare R2 presigned uploads | Confirmed, **design corrected** | R2 presigned URLs support GET, HEAD, PUT, DELETE. **POST (form/policy uploads) is not supported**, so a `content-length-range` rule is impossible. Sign `Content-Type` (and the exact `Content-Length`), then verify size with HEAD at completion. Presigned URLs work only on the S3 API domain, not custom domains, and need CORS for browser use |
| F6 | Aiven PostgreSQL and pgvector | Confirmed | pgvector (`vector` 0.8.1) is listed for PostgreSQL 14 to 17 (the PostgreSQL 18 row was truncated in what I read: **not verified**). Enabled per database with `CREATE EXTENSION`. Plan-specific availability and connection limits: **not verified** (needs your actual plan) |
| F7 | Aiven PgBouncer | Confirmed | Built in; default pool mode is transaction; pooled and non-pooled connections can be used at the same time on different ports; named prepared statements in transaction mode need `pgbouncer.max_prepared_statements` (default 100) |
| F8 | pg-boss | Confirmed | Current docs: Node 22.12 or newer, PostgreSQL 13 or newer; needs `pgcrypto` (superuser may need to add it) and `CREATE` privilege; own schema; **retries on by default** (default `retryLimit` 2 since v10), so handlers must be idempotent; `deadLetter` supported. Compatibility with PgBouncer transaction mode: **not verified**, so pg-boss uses a direct connection |
| F9 | Gemini API key type and authentication | Partly | Docs currently show API keys sent in an `x-goog-api-key` header, and a separate OAuth page exists. Whether either of your two keys is of a supported type, and its project and tier: **not verifiable from here** |
| F10 | Gemini model names | Partly | The docs site now advertises newer models than my training data (for example "Gemini 4 Argon"). Choose the generation model from the live models page at B1; **not decided** |
| F11 | Gemini quotas | Confirmed (2026-11-04) | Rate limits are per project, not per key; spend-based limits can also return 429 |
| F12 | Google OAuth library, graph layout libraries, OCR/PDF extraction libraries | **Not verified** | Evaluate in B2, B4, B3 respectively (DR-08, DR-07) |

## 2. F1 in detail: the age restriction (most important finding)

Source: Gemini API Additional Terms of Service, effective March 23, 2026, `https://ai.google.dev/gemini-api/terms` (page last updated 2026-04-28).

The terms say, in the "Age Requirements" section, that you must be 18 or older to use the APIs, **and** that you will not use the Services as part of a website, application or other service ("API Clients") that is **directed towards or is likely to be accessed by individuals under the age of 18**. The "Use Restrictions" section also says the Services are for developers building for professional or business purposes, not for consumer use, and that **only Paid Services** may be used when making API Clients available to users in the EEA, Switzerland or the UK.

Why it matters: RecallMap is described as a learning platform for students and may be used by school-age learners (compliance overview, `DR-15`). The restriction is on the *application*, not on who holds the key, and it is not limited to tutoring: it would also cover document concept extraction and embeddings. It applies equally to the primary and the secondary key. The paid tier does not remove it.

What is **not** established: whether Google would treat RecallMap as "directed towards or likely to be accessed by" minors if it is marketed to adults; whether the Google Cloud route (the docs mention a "Gemini Enterprise Agent Platform Gemini API" under Google Cloud terms) has different age terms; whether other providers would fit. These need your decision and qualified legal review (DR-18).

Options (none approved):

| Option | What it means | Trade-offs |
|---|---|---|
| A. 18+ product | Age gate and terms limited to adults (for example university and adult learners); no marketing to minors | Fits the Gemini terms most directly; removes school-age learners from scope; "likely to be accessed" risk remains if minors can plausibly sign up |
| B. Google Cloud route | Use Gemini through Google Cloud under its own terms, if those terms permit your audience | Needs verification of those terms, billing and different SDK/auth; may add cost |
| C. Different AI provider | Replace or add a provider whose terms permit your audience | Changes an approved architecture decision; the adapter design makes it feasible but it needs your approval |
| D. Ask Google | Written clarification or permission for an education product | Slow; outcome uncertain |

Recommendation: do not build any AI-dependent learner feature on the Gemini Developer API until DR-18 is resolved. Non-AI work (B1 foundation, B2 authentication, the non-AI parts of B3 such as upload and extraction) is not affected.

## 3. Sources read (all accessed 2026-11-05 unless noted)

| Topic | Source |
|---|---|
| Gemini API terms | https://ai.google.dev/gemini-api/terms |
| Available regions | https://ai.google.dev/gemini-api/docs/available-regions |
| Embeddings | https://ai.google.dev/gemini-api/docs/embeddings (updated 2026-10-29) |
| Rate limits (read 2026-11-04) | https://ai.google.dev/gemini-api/docs/rate-limits |
| R2 presigned URLs | https://developers.cloudflare.com/r2/api/s3/presigned-urls/ and https://developers.cloudflare.com/r2/data-access/s3-api/presigned-urls/ |
| Aiven extensions per version | https://aiven.io/docs/products/postgresql/reference/list-of-extensions-for-each-version |
| Aiven pgvector how-to | https://aiven.io/docs/products/postgresql/howto/use-pgvector |
| Aiven connection pooling | https://aiven.io/docs/products/postgresql/concepts/pg-connection-pooling |
| pg-boss | https://github.com/timgit/pg-boss (README and release notes) |

## 4. Design changes made because of this verification

1. Upload authorization now signs `Content-Type` and exact `Content-Length` instead of promising a length range; completion verifies size and type with a HEAD request; the worker re-validates content; an R2 lifecycle rule removes incomplete or unreferenced objects. (`AI_AND_DOCUMENT_PIPELINE.md`)
2. Embeddings: record model and dimension per chunk (already designed); candidate `gemini-embedding-2` at 768 or 1536 dimensions. pgvector indexes on the `vector` type are limited in dimension (verify the limit at B1), which is another reason to start with exact search and recommended truncated sizes (DR-06).
3. Aiven: API uses the pooled connection (transaction mode, with prepared-statement setting reviewed), worker and pg-boss use the direct connection. (`SYSTEM_ARCHITECTURE.md`)
4. Hosting must provide Node 22.12 or newer (pg-boss).
5. New blocking decision DR-18; DR-02 updated with the verified paid/unpaid terms.

## 5. Free-tier verification (2026-11-05)

Full detail: `docs/deployment/FREE_TIER_INFRASTRUCTURE.md`; simulation: `docs/testing/INFRA_COMPATIBILITY_SPIKE.md`; libraries: `docs/architecture/TECH_RESEARCH.md`.

| Item | Result |
|---|---|
| Aiven free PostgreSQL | Verified: 1 CPU, 1 GB RAM, **1 GB disk**, `max_connections` 20, **no pooling**, no static IPs/VPC, may be powered off when inactive, backups included (details unverified). pgvector on the free plan: **unverified** |
| Render free | Verified: web services spin down after 15 idle minutes (about a minute to wake), 750 free instance hours per workspace per month, **no free Background Workers or Cron Jobs** |
| Cloudflare R2 | Verified: free 10 GB-month, 1M Class A, 10M Class B, free egress; payment-method requirement for activation unverified |
| Drizzle + pgvector + pg-boss within the limits | **Simulated, passed with observations** (ER-003): not a test of the real services |
| Libraries | Verified from npm: Arctic 3.7.0, drizzle-orm 0.45.4, drizzle-kit 0.31.11, pg 8.23.1, pg-boss 12.38.1 (Node >= 22.12), others in TECH_RESEARCH |
