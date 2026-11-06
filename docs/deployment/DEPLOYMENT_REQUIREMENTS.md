# RecallMap: Deployment, Operations, Backup and Recovery Requirements

> **Phase 0 note (2026-11-05):** development currently runs on Aiven free + Render free (`FREE_TIER_INFRASTRUCTURE.md`, `SETUP_GUIDE.md`). The production-oriented targets below (availability, RPO/RTO, scheduled R2 backups, restore drills) are **not met by the free tier** and are required before any real learner data exists.

**Status: REQUIREMENTS and PROPOSED targets. Nothing is deployed from this design yet.** The current repository's deployment (if any) is the frontend-only prototype; its hosting configuration has not been inspected. Last updated 2026-11-04.

## 1. Environments

Development, automated test (throwaway DB), staging (synthetic data only, own R2 bucket and Gemini credentials), production. Each has isolated database, storage credentials, AI credentials, and OAuth client. Missing required production configuration fails startup (Zod); it never falls back to demo data.

## 2. Hosting requirements

| Component | Requirement | Open question |
|---|---|---|
| Next.js (UI + API) | Node 22 runtime; API routes need pooled DB connections if run serverless | Serverless (for example Vercel) versus a persistent host: DR-05 |
| Worker | **Persistent process, not serverless**; Node 22; graceful SIGTERM; outbound access to Aiven, R2, Gemini; memory sized by measurement (PDF/OCR can be heavy, assume 1 GB or more until measured); no inbound ports except a health check; isolated container | Host choice and size: DR-05 |
| PostgreSQL | Aiven plan with pgvector, enough connections for API + worker + pg-boss, PITR/backups, TLS | verify plan and version: DR-03 |
| R2 | two private buckets (`uploads`, `backups`), separate API tokens with least privilege, no public access | |
| Domain/TLS | one domain, HTTPS only; cookies scoped to it | |

**Cost drivers (no figures asserted; collected in B1):** always-on worker, Aiven plan tier, R2 storage and operations, Gemini tokens (extraction, embeddings, tutoring, question generation), OCR compute, monitoring/error tracking. Per-user AI budgets exist to bound the largest variable cost.

## 3. Configuration (Zod-validated; documented in `docs/ENVIRONMENT_SETUP.md`)

Database URL and pool sizes, session secret(s), Google OAuth client id/secret and redirect URIs, R2 account/bucket/credentials, Gemini keys and flags (see AI doc), model names, rate-limit and budget values, queue concurrency, feature flags, log level. Secrets live only in the host's secret store.

## 4. CI/CD gates

On every change: typecheck, lint, unit and integration tests (real Postgres service container), `npm audit`, secret scan, production build. Migrations are applied by a controlled deploy step, never at app boot in production. Rollback: previous build plus forward-fix migrations; destructive schema changes need a verified restore point first.

## 5. Backups and disaster recovery

**Proposed targets (not guarantees; validate against the plan's capabilities):** API availability 99.5% monthly; database RPO 24 h or better; RTO 8 h; automatic retry of recoverable jobs; restore procedure reviewed at least quarterly.

1. **Aiven managed backups** per the selected plan (verify retention and PITR).
2. **Scheduled export to R2** (worker job `backup.database`): consistent `pg_dump` in custom format (never raw data-file copies), compress, **encrypt before upload**, SHA-256 checksum, upload to the private `backups` bucket under `recallmap-backups/YYYY/MM/recallmap-db-YYYY-MM-DD-HHMM.dump`, verify the upload, write `backup_runs`, alert on failure or if overdue. Never overwrite the only backup. Initial schedule: daily; consider every 6-12 h if usage justifies it.
3. **Retention (initial proposal):** dailies 30 days, selected monthlies 12 months; confirm storage cost and any legal requirement.
4. **Uploaded files:** originals in R2 are protected separately (bucket versioning or lifecycle policy to be evaluated; database restore must not point at missing files). A scheduled reconciliation job reports orphaned objects and rows with missing objects.
5. **Restore verification:** at least monthly, restore into an isolated PostgreSQL, run migrations check, verify extensions, table counts and relationships, a sample of users/evidence/document references, and application compatibility. **A backup is not verified until a restore has passed.** Results go in `docs/testing/TEST_EXECUTION_REPORT.md`.
6. Encryption keys for backups are stored separately from the backups and rotated; loss of the key means loss of the backup, so the key procedure is part of the recovery runbook.

## 6. Monitoring and operations

Structured logs; metrics for API latency/errors, auth failures, DB health, queue depth and age, job failures by stage, Gemini failures and **fallback use per slot**, extraction/OCR/embedding failures, token use and estimated cost per feature and user. Alerts on repeated job failures, overdue backups, secondary-key auth failure, quota nearing. An internal operations dashboard (health, latency, queue, failed jobs, AI consumption, DB) is planned for B8. Incident response and recovery runbooks are written in B8 (`docs/deployment/INCIDENT_RESPONSE.md`, `BACKUP_AND_RECOVERY.md`).

## 7. Retention (initial proposal, to be finalized in B2)

Operational logs: short fixed period (for example 30 days), no content. Failed-job records: until resolved plus a short period. Temporary files: deleted on completion or expiry. Backups: per section 5. Learner data: until the learner deletes it or closes the account.
