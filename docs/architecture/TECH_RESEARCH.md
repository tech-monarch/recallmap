# RecallMap: Remaining Technical Research (2026-11-05)

Labels: **Verified** (package registry or official page read 2026-11-05), **Third-party** (articles, comparison sites: indicative only), **Unverified**. Package facts (version, licence, last-modified date, Node engines) come from `npm view` on 2026-11-05. Recommendations are proposals; approvals are in `docs/milestones/DECISION_REGISTER.md`.

## 1. Google OAuth and sessions (DR-19)

| Option | Facts | Fit |
|---|---|---|
| **Arctic** 3.7.0 (MIT, modified 2026-07-29) | OAuth 2.0 provider clients including Google with PKCE helpers; runtime-agnostic; no session layer | **Recommended**: we already designed our own opaque, hashed, revocable DB sessions and need framework-independent code (API must be extractable from Next.js) |
| Better Auth 1.7.18 (MIT, very active) | Full auth framework with a Drizzle adapter and its own session/user tables | Credible alternative; adds its schema and API surface, which conflicts with our own identity tables and isolation tests |
| Auth.js / next-auth | Stable npm release is still 4.24.15; v5 line is "beta". Third-party reports (LogRocket, 2026): the Better Auth team took over maintenance in September 2025 and the library is in security-patch mode; DB sessions and Next 16's `proxy.ts` do not mix easily; JWT sessions cannot be revoked before expiry | Not recommended for a new build with revocable sessions |
| openid-client / hand-rolled | More code to get wrong | Not recommended |

Implementation notes (Proposed): Authorization Code + **PKCE** + `state` (stored server-side in `oauth_states`, single use, short TTL); verify the ID token server-side (issuer, audience, expiry, `email_verified`); link by Google `sub`; opaque 256-bit session token, only its hash stored; cookie `HttpOnly`, `Secure` in production, `SameSite=Lax`; rotation on sign-in; session list and revoke. Route protection in Next 16 uses `proxy.ts` (the renamed middleware, per the third-party report) plus a server-side check in layouts and every API route; **the proxy is only a redirect convenience, authorization lives in the services**. Re-verify Arctic's current API at install time.

## 2. Knowledge-graph visualization and layout (DR-08)

| Library | Facts | Role |
|---|---|---|
| `@dagrejs/dagre` 3.1.3 (MIT, 2026-10-24) | maintained fork (the old `dagre` 0.8.5 was last published 2022); layered layouts for DAGs | **Hierarchical layout** candidate; simple, small |
| `elkjs` 0.12.1 (**EPL-2.0 OR GPL-3.0-or-later**, 2026-10-28) | very capable layered layouts and ports | Strong alternative; check licence suitability for your distribution before adopting |
| `d3-force` 3.0.1 (ISC, 2026-11-03) | force simulation (positions only; you render) | **Dynamic layout** candidate; works with the existing SVG |
| `@xyflow/react` (React Flow) 12.12.1 (MIT, 2026-11-04) | React renderer with pan, zoom, drag, keyboard and accessibility affordances | Optional renderer for both layouts instead of the hand-built SVG |
| `cytoscape` 3.34.4 (MIT) | graph library with many layouts; heavier, imperative | Fallback |

Proposal: prototype in B4 with `@xyflow/react` + `@dagrejs/dagre` (hierarchical) + `d3-force` (dynamic) and compare against keeping `KnowledgeGraph.tsx` with computed positions; decide on keyboard accessibility, touch behaviour, bundle size and test effort. Cycles: break edges **for layout only**; stored data is never changed. This evaluation is preparation, nothing is installed.

## 3. Document extraction and OCR (DR-07, DR-20, DR-23)

| Need | Candidate | Facts | Notes |
|---|---|---|---|
| File type detection by magic bytes | `file-type` 22.3.0 (MIT) | engines Node >= 22 | use alongside our own validators |
| PDF text layer | `pdfjs-dist` 6.5.438 (Apache-2.0) | engines Node >= 22.13 or >= 24 | maintained by Mozilla; heavier to wrap |
| PDF text (wrapper) | `unpdf` 2.1.0 (MIT) | **engines Node >= 24** | convenient, forces Node 24 |
| DOCX | `mammoth` 1.13.0 (BSD-2) | text and structure to HTML/text | no macros executed |
| DOCX/PPTX/XLSX/PDF generic | `officeparser` 8.6.0 (MIT) | very strict Node engine ranges (patched 22.23.4+ / 24.22.1+ / 26.12.1+) | verify behaviour and archive limits before use |
| XLSX | `xlsx` 0.18.5 and `exceljs` 4.4.0 | npm `xlsx` appears stale (last 2026-07-17 for 0.18.5 line) and has known advisories in my knowledge (Unverified, check with `npm audit`); `exceljs` last published 2024-12 | prefer a maintained parser or convert XLSX to CSV text; add archive size limits |
| OCR (local) | `tesseract.js` 7.0.0 (Apache-2.0, last modified 2025-12-15) | WASM, CPU/memory heavy; slower release cadence | privacy-friendly; evaluate on real scanned notes; heavy for a 512 MB free instance, run on a local/standalone worker |
| OCR (provider) | Gemini multimodal or a dedicated OCR API | better quality | sends images to a provider: **subject to DR-18 and the synthetic-data rule** |
| Image preprocessing | `sharp` 0.35.5 | Node >= 20.9 | resize/rotate before OCR |

Node version (DR-20): `unpdf` needs 24 and `pdfjs-dist` needs 22.13+; pg-boss needs 22.12+; Next 16.4.5 accepts newer. Proposal: **Node 24 LTS** for Render and local (confirm Render supports it via `NODE_VERSION`, and that Next/Drizzle/pg-boss are fine on it in CI) and pin it in `.nvmrc`/`engines`. The audit sandbox runs Node 22.23.4, so some libraries could not be exercised here.

Hardening still required whatever the libraries: size/page/uncompressed-size/entry-count limits, no macro execution, no external references, per-job time and memory limits, magic-byte checks.

## 4. Gemini models, pricing, quotas and embeddings

- **Models:** Google's docs now advertise newer generations than my training data. Third-party price trackers (Oct 2026) list Flash and Flash-Lite generations (for example "3.8 Flash", "3.6 Flash", "3.5 Flash-Lite", "3.1 Flash-Lite") with free tiers on selected Flash/Flash-Lite models, and a higher-priced flagship that has no free tier. **Pick the generation model from the live AI Studio models page at B1; do not hard-code names in architecture.** (Third-party)
- **Prices (Third-party, indicative):** small "Flash-Lite" models are around $0.25 input / $1.50 output per million tokens; Flash models roughly $0.75 to $1.50 input and $3.75 to $9 output; flagship models more; `gemini-embedding-001` around $0.15 per million tokens. Free-tier use is $0 but content may be used to improve products (Verified in the terms), hence synthetic data only. Prices have risen on some models during 2026: **re-check before budgeting**.
- **Quotas:** per project, tier-dependent, spend-based limits also return 429 (Verified 2026-11-04); free tier limits are low and can change.
- **Embeddings (Verified 2026-11-05):** `gemini-embedding-2` (multimodal, 8,192-token input) and `gemini-embedding-001` (text, 2,048); output size 128-3072, recommended 768/1536/3072; models are not interchangeable (re-embed on change). For Phase 0 use 768 dimensions.
- **Structured output:** supported by the SDK/API in current docs (details not re-verified); every output is validated with Zod regardless.
- **Cost control:** `ai_usage` per call, per-user daily budgets, caching of stable prompts, smaller models for extraction/grading, batch embeddings.

## 5. Alternative AI providers (contingency for DR-18)

**Not researched yet** beyond the Gemini terms. Candidate classes and the questions each must answer before adoption:

| Class | Candidate examples (not evaluated) | Must verify |
|---|---|---|
| Gemini via Google Cloud (Vertex AI / "Gemini Enterprise Agent Platform") | Google | Whether its terms allow applications likely to be used by under-18s, data-processing terms, regional availability, billing: the owner has said **not to assume this resolves the age restriction** |
| Other commercial LLM APIs | several | terms for minors and educational use, no-training-on-API-data commitments, DPA, data residency, availability in Nigeria, structured output, embeddings, price |
| Open-weight models (self-hosted or hosted by a third party) | Gemma and others | licence terms for the intended use, hosting cost, quality for tutoring and grading, safety tooling |
| Education-specific offerings | to be identified | terms and pricing |

Evaluation checklist: contractual age terms; training/retention terms; DPA availability; data location; quality on our evaluation sets (concept extraction, question quality, grounding); latency; cost per learner; vendor lock-in. The `AiProvider` interface (generate, structured generate, embed) plus slot logic keeps swapping a provider an adapter change. Output: a short comparison document before any production decision. This is a research task to start after B1a, not a decision.

## 6. PostgreSQL and pg-boss compatibility

Verified by simulation (`docs/testing/INFRA_COMPATIBILITY_SPIKE.md`), unverified on Aiven. Design consequences recorded: use `exclusive`/`short`/`stately` queue policies with `singletonKey` for deduplication (standard queues do not deduplicate); every handler honours `job.signal`; at least two consumers; use the direct connection; do not enable LISTEN/NOTIFY on the free plan (extra dedicated connection); `PgBoss` is a named export in v12; the owner role needs schema-creation rights and `pgcrypto`.

## 7. Security, privacy and compliance additions

1. **Processors now planned for Phase 0:** Aiven (database), Render (hosting), Cloudflare (R2), Google (OAuth and Gemini). Each needs its terms and region recorded in `docs/compliance/THIRD_PARTY_PROCESSORS.md` before real data exists.
2. **Synthetic-data rule (owner decision):** enforced technically by `AI_DATA_MODE` and procedurally: no real learner data, no minors' documents, no real accounts in `cloud-dev`.
3. **Aiven free: no static IPs, no VPC:** database access cannot be IP-restricted tightly, so credentials, TLS and rotation are the controls.
4. **Free tiers and backups/availability:** no guarantees; acceptable only for synthetic development data.
5. **Google OAuth consent for a product aimed at minors, NDPA obligations, parental consent, minimum age:** unchanged open legal items (DR-14, DR-15, DR-16, DR-18).
6. **Supply chain:** pinned lockfile, `npm audit` in CI (production dependencies currently 0 findings), verify package licences (`elkjs` is EPL/GPL), re-check stale parsers.
7. **Secrets:** all credentials via host environment settings or ignored local files; GitHub tokens only via a secure mechanism (pasted tokens are considered exposed).
