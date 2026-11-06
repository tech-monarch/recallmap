# RecallMap: Security and Privacy Architecture

**Status: PROPOSED design. No control below is implemented yet** (the frontend has no auth, no backend). Last updated 2026-11-04. Test status lives in `docs/testing/`; nothing here is "tested" until executed there.

## 1. Threats and controls

| Threat | Control (Proposed) | Verified by |
|---|---|---|
| Unauthorized access / IDOR | identity from session only; repositories require `userId`; cross-user access returns `404`; per-route generated IDOR tests | SEC-AUTHZ-* |
| Session theft / fixation | opaque 256-bit token, only its hash stored; `HttpOnly`, `Secure`, `SameSite=Lax`; rotation on sign-in; idle and absolute expiry; revoke on sign-out and from the sessions list | SEC-SESS-* |
| OAuth attacks | `state` (single use, short TTL), PKCE, server-side ID token verification (issuer, audience, expiry, `email_verified`), exact redirect URI allowlist; no client-trusted identity | SEC-AUTH-* |
| Account linking abuse | link by Google `sub`, not by email alone; a different `sub` with an existing email never merges silently | SEC-AUTH-* |
| CSRF | `SameSite=Lax` plus `Origin` check and custom header on unsafe methods; no state change on GET | SEC-CSRF-* |
| XSS | React escaping; no `dangerouslySetInnerHTML` for user or AI content (the one existing use injects a constant theme script); strict CSP (nonce-based) and security headers; AI/markdown output rendered through a sanitizing renderer | SEC-XSS-* |
| SQL injection | Drizzle parameterization only; no string-built SQL; lint rule against raw `sql` with interpolation | SEC-SQLI-* |
| Malicious uploads | section 3 of `AI_AND_DOCUMENT_PIPELINE.md`: magic bytes, limits, zip-bomb defence, no macro/script execution, parser isolation, private R2, presigned URLs bound to one key | SEC-UPLOAD-* |
| Prompt injection | untrusted-data delimiting, no tools with data access, server-side validation of every AI-produced id and citation, deterministic rules cannot be bypassed | SEC-PI-* |
| Abuse of expensive operations | per-user and per-IP rate limits, per-user AI budgets, upload and job caps, global Gemini concurrency cap | SEC-RATE-* |
| Secret exposure | env validated by Zod; keys server-only, never `NEXT_PUBLIC_*`; secret scanning in CI and pre-commit; ZIP/Git excludes | SEC-SECRET-* |
| Information leakage | generic errors with `requestId`; no stack traces; logs exclude tokens, keys, documents | SEC-LEAK-* |
| Dependency vulnerabilities | `npm audit` in CI, lockfile review, Dependabot-style updates; **critical/high unresolved findings block production release** unless a documented exception exists | SEC-DEP-* |
| Third-party AI processor risk | task eligibility list, learner-content gate, six secondary gates, minimization | SEC-AI-* |
| Data loss | backups and restore tests (`docs/deployment/DEPLOYMENT_REQUIREMENTS.md`) | OPS-* |

## 1a. Phase 0 free-tier notes (2026-11-05)
Aiven free has no static IPs or VPC, and Render free has shared outbound addresses, so the database cannot be IP-restricted tightly: TLS, a dedicated application role, strong generated passwords, rotation on any exposure, and synthetic data only are the controls. Free tiers offer no availability or backup guarantees, which is acceptable only for synthetic development data.

## 2. Headers and transport

HTTPS only (HSTS), `Content-Security-Policy` with nonces (the theme bootstrap script gets a nonce), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, frame protection, restrictive CORS (same-origin initially; explicit allowlist after any extraction). Existing `next.config.ts` has `/sw.js` header rules for a service worker that does not exist; remove or replace in B0.

## 3. Privacy architecture

- Private by default; each learner owns their data; user deletion of material, subject, conversation, and account (see `DATABASE_SCHEMA.md` section 7), with data hidden immediately and removed by a tracked job. Backups age out per the retention policy.
- Data sent to AI providers is minimized per task; the secondary provider receives only the tasks in the eligibility table; the learner-content gate blocks tutoring and grading in production until the provider's data terms are verified.
- Accurate disclosure: privacy policy and AI transparency notice must describe the actual processors (Aiven, Cloudflare, Google/Gemini, the host, Google sign-in) and must not claim "never processed by third parties" unless provider terms and configuration prove it.
- Logs: structured, request and job ids, durations, error categories, provider and key **slot**; never tokens, keys, raw documents, or unnecessary personal data. Retention periods are defined in the data-retention policy (draft in B2).
- Minors: school-age use is likely. No minimum age or compliance claim is made here; see `docs/compliance/COMPLIANCE_OVERVIEW.md` and DR-15.

## 4. Authorization model

Learners own everything under their `subject_instances`. Shared curriculum data is read-only to learners. Operator capabilities (deep health, dead-letter inspection, template authoring) are separate from learner accounts and allowlisted. The AI has no database or administrative access: it receives prompt text and returns data that services validate.

## 5. Security release gates (B8, and relevant gates earlier)

Dependency audit, secret scan, static analysis, authorization and cross-user suite, upload suite, prompt-injection suite, output-validation suite, header check, manual review. No unresolved critical/high issue without a reviewed exception and mitigation plan. A test suite cannot prove zero vulnerabilities; the reports state coverage, findings, remediation, and limits.
