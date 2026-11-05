# RecallMap: Security Test Plan

**All tests below are PLANNED. None has been executed.** This is the plan from which `SECURITY_TEST_CASES.md` (full 16-field cases) will be written as each control is implemented. Each executed case will record: ID, name, objective, threat, environment, prerequisites, tools and versions, steps, expected result, actual result, evidence, date, status, issue, remediation, retest result.

| ID | Objective | Threat | Milestone | Status |
|---|---|---|---|---|
| SEC-AUTH-01..05 | OAuth `state` mismatch/replay rejected; PKCE enforced; ID token audience/issuer/expiry checked; unverified email rejected; redirect URI allowlist | login CSRF, token substitution, open redirect | B2 | Planned |
| SEC-SESS-01..05 | cookie flags; expiry (idle and absolute); revocation on sign-out; revoked session unusable; token never stored in plaintext | session theft/fixation | B2 | Planned |
| SEC-AUTHZ-* (generated per route) | user B cannot read/modify/delete any of user A's resources; ids guessed return 404 | IDOR, privilege escalation | B2 onward | Planned |
| SEC-CSRF-01..03 | unsafe request without Origin/custom header rejected; cross-site form post fails; GET has no side effects | CSRF | B2 | Planned |
| SEC-XSS-01..04 | script in subject name, pasted text, concept text, AI output rendered inert; CSP blocks inline injection | stored/reflected XSS | B3-B5 | Planned |
| SEC-SQLI-01..02 | injection payloads in filters, ids, search are parameterized; lint forbids interpolated raw SQL | SQL injection | B2 onward | Planned |
| SEC-UPLOAD-01..10 | wrong magic bytes; mismatched MIME; oversized; zip bomb; deeply nested archive; macro-enabled file; encrypted PDF; path traversal entry; SSRF via external reference; presigned URL reuse/other key | malicious files | B3 | Planned |
| SEC-RATE-01..04 | limits on auth, upload authorization, AI endpoints, job creation; 429 and Retry-After | abuse, cost exhaustion | B2-B5 | Planned |
| SEC-PI-01..06 | document and chat injections cannot change instructions, reveal secrets/other users' data, force an ineligible recommendation, forge citations, or trigger actions | prompt injection | B5-B6 | Planned |
| SEC-AI-01..04 | secondary key never used for ineligible tasks; no fallback on 400/401/403/safety; secondary disabled leaves primary unaffected; secondary 401 auto-disables | AI processor misuse | B1/B5 | Planned |
| SEC-SECRET-01..03 | no secrets in bundle, logs, API responses, repository, ZIP; secret scan in CI | credential exposure | every milestone | Planned |
| SEC-LEAK-01..02 | errors carry requestId only; no stack traces | information leakage | B2 | Planned |
| SEC-DEL-01..03 | deleting material/subject/account removes DB rows, R2 objects, embeddings; data hidden immediately | privacy, retention | B2-B3 | Planned |
| SEC-HDR-01 | security headers and CSP present | clickjacking, MIME sniffing | B8 | Planned |
| SEC-DEP-01 | dependency audit has no unresolved critical/high without an approved exception | known CVEs | every milestone | **Baseline executed (ER-001): failing**, see report |
| OPS-BKP-01..03 | backup job produces encrypted, checksummed dump; restore passes in isolation; orphan detection works | data loss | B8 | Planned |
