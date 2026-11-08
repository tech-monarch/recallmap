# RecallMap: Setup Guide for the Free-Tier Environments

**Status: instructions for resources that do not exist yet. Nothing here has been run against Aiven, Render or R2.** Console labels change over time; where a step names a setting, treat the name as a guide. Every step is free. **Stop and ask the owner before adding any payment method or choosing a paid plan.** Scripts and npm commands marked do not exist in the repository yet.

## 1. Environments

| Environment | Runs where | Database | Storage | AI | Data |
|---|---|---|---|---|---|
| `local` | your machine | local PostgreSQL with pgvector (Docker), one database per purpose (`recallmap_dev`, `recallmap_test`) | R2 dev bucket, or fakes in tests | fake provider by default; Gemini with a dev key only when you choose | synthetic |
| `cloud-dev` | Render free web service | Aiven free service, database `recallmap_dev` (and `recallmap_staging` if wanted) | R2 bucket `recallmap-dev-uploads` | Gemini Developer API, `AI_DATA_MODE=synthetic` | synthetic only |
| `production` | **not created** | **not created** | **not created** | n/a | real learners only after DR-18 and the checks in `FREE_TIER_INFRASTRUCTURE.md` section 9 |

`APP_ENV` (`local`/`cloud-dev`/`production`) is read by the configuration module; production-only rules (stricter cookies, `AI_DATA_MODE` guard) key off it, never off hostnames.

## 2. Aiven free PostgreSQL

1. Create an Aiven account (no card needed for the free plan).
2. Create a service: **PostgreSQL**, plan **Free**. Choose the newest PostgreSQL version offered that supports pgvector (17 per Aiven's extension list; check what the console lists). Pick the region nearest your Render region to keep latency low.
3. Wait until the service shows as running. Copy the **Service URI** (it contains the password) into your local `.env.local` as `DATABASE_URL`, and into Render's environment settings later. Never paste it into chat, documents, or Git.
4. Download or note the CA certificate if your client needs it (`sslmode=require` is the minimum).
5. **Run the acceptance test (section 7.3).** Tell me the results (the output contains no secrets). This is the verification gate for B1b.
6. Create the extra databases and an application role (recommended) from the console or `psql`:
   ```sql
   CREATE DATABASE recallmap_dev;
   CREATE DATABASE recallmap_staging;           -- optional
   CREATE ROLE recallmap_app LOGIN PASSWORD '<generate a long random value>';
   GRANT ALL PRIVILEGES ON DATABASE recallmap_dev TO recallmap_app;
   \c recallmap_dev
   CREATE EXTENSION IF NOT EXISTS vector;       -- as the admin user
   CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- needed by pg-boss
   GRANT ALL ON SCHEMA public TO recallmap_app;
   ```
   (Exact privilege statements may need adjusting after the acceptance test; record what actually worked.)
7. Remember the free plan **can be powered off when inactive**: if the app reports `database_unavailable`, power the service on in the console.
8. Before any schema change, take a manual dump: `pg_dump --format=custom --file=recallmap_dev_YYYYMMDD.dump "$DATABASE_URL"` and keep it outside the repository (`*.dump` is not yet in `.gitignore`: add it when the first dump is made).

## 3. Render (free web service)

1. Create a Render account and connect GitHub with access **only to `tech-monarch/recallmap`**.
2. New **Web Service**, runtime **Node**, branch `main`, instance type **Free**.
3. Build command `npm ci && npm run build`; start command `npm run start`. Render sets `PORT`; `next start` reads it (confirm `next start` binds all interfaces on the first deploy).
4. Environment variables (section 6). **Node 24** (DR-20): Render reads `NODE_VERSION`, `.node-version`, `.nvmrc`, or `package.json` `engines` (precedence in that order, verified in Render's docs 2026-11-07; services created since 2026-04-21 default to 24.14.1). The repository pins Node 24 in `.nvmrc` and `engines` (`>=24.0.0 <25`, with the upper bound Render recommends); setting `NODE_VERSION=24` explicitly is still the clearest choice.
5. Health check path: `/api/v1/health`; until it exists leave the default.
6. Auto-deploy: start with **manual deploys** (or auto-deploy from `main` only once CI is green) to avoid broken deployments consuming build minutes.
7. Note the service URL (`https://<name>.onrender.com`): it becomes the OAuth redirect host for `cloud-dev`.
8. Expect a cold start of about a minute after 15 idle minutes. Do not add a paid instance without approval.

## 4. Cloudflare R2 (decide the payment-method question first)

**Is a payment method required? UNVERIFIED (DR-22).** Cloudflare's own sources disagree: the R2 product page says "no credit card required"; the current R2 "Get started" page says only that R2 is free to get started with included monthly usage; an older cached copy of the docs said you must "purchase R2" before creating a bucket; several third-party tutorials say a card or PayPal is requested for verification. Do not add a card because a tutorial says so. **Exact steps for you:**
1. Log in to the Cloudflare dashboard and open **R2 Object Storage** (left sidebar; the menu may be under "Storage & databases").
2. Look at what the page asks **before you click anything that says Purchase, Subscribe or Add payment**. If it lets you click **Create bucket** directly, no payment method is needed: proceed with the steps below.
3. If it asks for a payment method or shows a **Purchase R2 / Enable R2** button: **stop**. Take a screenshot (hide any personal details) or copy the wording, and tell me. Do not enter a card.
4. If a card is required you have three options; the decision is yours: (a) decline, and we develop with the in-memory/local object store until you decide; (b) add a card, set Cloudflare billing notifications first, and stay inside the free allowance (10 GB-month, 1M writes, 10M reads; overage is billed and I have **not** verified that a hard spending cap exists); (c) evaluate another object store with a free tier (not researched).
Until you decide, nothing in the repository needs R2: B1a uses the fake object store.

1. Create or use a Cloudflare account. **Check whether enabling R2 asks for a payment method; if it does, pause and decide deliberately.** R2's free allowance is 10 GB-month, 1M writes, 10M reads, and egress is free; overage is billed.
2. Create a **private** bucket `recallmap-dev-uploads` (no public access, no public development URL).
3. Create an API token limited to that bucket with Object Read & Write. Copy the account id, access key id and secret into the environment only.
4. Add a **CORS rule** allowing `PUT` (and `GET`, `HEAD`) from your app origins (`http://localhost:3000`, the Render URL) with the headers the signed request needs (`Content-Type`, `Content-Length` is set by the browser).
5. Add a lifecycle rule to delete incomplete multipart uploads and `tmp/` objects after a day or two.
6. Presigned URLs work on the S3 API endpoint (`https://<account>.r2.cloudflarestorage.com`), not on custom domains.

## 5. Google OAuth client (needed from B2)

Create an OAuth client (type Web application) in a Google Cloud project. Redirect URIs: `http://localhost:3000/api/v1/auth/google/callback` and `https://<render-name>.onrender.com/api/v1/auth/google/callback`. Keep the consent screen in testing mode with named test users while only synthetic accounts exist. Never reuse a production client for development. (Whether the OAuth consent screen for a product aimed at under-18s raises its own policy questions is part of the DR-18/DR-15 legal review.)

## 6. Environment variables (design; validated by Zod at startup)

| Variable | Local | cloud-dev | Notes |
|---|---|---|---|
| `APP_ENV` | `local` | `cloud-dev` | |
| `DATABASE_URL` | local PostgreSQL | Aiven (direct) | `sslmode=require` on Aiven |
| `DATABASE_POOLED_URL` | unset | unset | for a future plan with pooling |
| `DB_POOL_MAX_API` / `DB_POOL_MAX_WORKER` / `PGBOSS_POOL_MAX` | 5 / 2 / 3 | 5 / 2 / 3 | budget in `FREE_TIER_INFRASTRUCTURE.md` section 5 |
| `WORKER_MODE` | `standalone` (separate terminal) or `embedded` | `embedded` | `off` for API-only |
| `SESSION_SECRET` | random | random | different per environment |
| `GOOGLE_OAUTH_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` | dev client | dev client | B2 |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_UPLOADS` | dev bucket | dev bucket | |
| `AI_DATA_MODE` | `synthetic` | `synthetic` | `real` refuses to start without an approval reference |
| `AI_REAL_DATA_APPROVAL_REF` | unset | unset | production only, after DR-18 |
| `GEMINI_API_KEY_PRIMARY` | dev key (optional) | set | `GEMINI_API_KEY_SECONDARY` stays unset and `GEMINI_SECONDARY_ENABLED=false` until gates G1-G6 pass |
| `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | chosen from the live model list at B1 | same | |
| `DEV_MAX_UPLOAD_MB`, `DEV_MAX_PAGES`, `WORKER_CONSUMERS` | 5, 20, 2 | 5, 20, 2 | free-instance protection; at least two consumers so one stuck job cannot block the queue |

Anything in the browser must start with `NEXT_PUBLIC_` and must never hold a secret.

## 7. Local development and verification

### 7.1 Prerequisites
Node **22.12 or newer** (pg-boss), npm, Git, Docker (or a native PostgreSQL with pgvector). The sandbox used for the audit has Node 22.23.4.

### 7.2 Local database
Use a pgvector-enabled PostgreSQL image (for example `pgvector/pgvector:pg17`, verify the tag) with `max_connections=20` to mimic the free plan, and create `recallmap_dev` and `recallmap_test`. Then:
```bash
npm ci
cp .env.example .env.local        # fill in local values
npm run dev                       # web (+ embedded worker if WORKER_MODE=embedded)
npm run worker                    # standalone worker (heavy jobs)
npm run db:generate && npm run db:migrate   # generate and apply migrations
npx tsc --noEmit && npx vitest run && npx eslint && npm run build
```

### 7.3 Aiven acceptance test (owner runs after creating the service; free, read-mostly)

**Executable version (B1a):** `scripts/verify-infra.ts`. It never prints the connection string or password.
```bash
DATABASE_URL='<admin connection string>' npm run verify:infra                          # checks 1-8
DATABASE_URL='<admin connection string>' npm run verify:infra -- --migrate            # also applies the Drizzle migrations to that database
DATABASE_URL='<admin connection string>' npm run verify:infra -- --skip-connection-probe
DATABASE_URL='<admin connection string>' npm run verify:infra -- --watch-reconnect    # then restart the service from the Aiven console
```
It checks: PostgreSQL version; `max_connections` and reserved slots; extensions offered; **`CREATE EXTENSION vector`** and the installed pgvector version; a pgvector query; schema-creation privilege; Drizzle migrations (with `--migrate`); a **pg-boss** schema plus a job round trip in a probe schema (dropped afterwards); and the observed connection cap. `--watch-reconnect` pings every two seconds on one pool and prints the outage length and the reconnection while you restart or power-cycle the free service, which measures **restart and reconnection behaviour on the real service**. Use the **admin** connection (an application role may not be allowed to create extensions). It exits non-zero if any check fails. The local runs recorded in `docs/testing/TEST_EXECUTION_REPORT.md` (ER-004) are simulations, **not** an Aiven result.

**Manual SQL alternative** (same checks by hand):
Run in the Aiven console query tool or `psql "$DATABASE_URL"`, and send me the output:
```sql
SELECT version();
SHOW max_connections;
SHOW superuser_reserved_connections;
SELECT name, default_version FROM pg_available_extensions WHERE name IN ('vector','pgcrypto');
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector','pgcrypto');
CREATE SCHEMA IF NOT EXISTS probe_schema; DROP SCHEMA probe_schema;   -- schema creation privilege (pg-boss)
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT current_user, rolsuper FROM pg_roles WHERE rolname = current_user;
```
Pass criteria: `vector` and `pgcrypto` created, schema creation allowed, `max_connections` 20, a PostgreSQL version that lists pgvector. A fail on `vector` means document search work (B3) must move to another database plan before it starts; B1a is unaffected.

### 7.4 Simulation already run
`docs/testing/INFRA_COMPATIBILITY_SPIKE.md` records the Drizzle / pgvector / pg-boss test on a local PostgreSQL with the same connection cap. It is **not** a substitute for 7.3.

## 8. Migration and deployment procedures (Proposed)

1. Branch, change `src/server/**/schema.ts`, run `npm run db:generate`, review the generated SQL (never hand-edit applied migrations), commit it.
2. CI applies all migrations to an empty database and runs the isolation and schema tests.
3. Before touching `cloud-dev`: manual `pg_dump` (section 2.8).
4. Apply to `cloud-dev` **from your machine or a manually triggered CI job** with `DATABASE_URL` pointing at Aiven: `npm run db:migrate`. Migrations never run automatically at app boot. (Render pre-deploy commands are not assumed available on the free plan.)
5. Deploy the web service (manual deploy), watch the logs, call `/api/v1/health`, run a smoke test with synthetic data.
6. Rollback: redeploy the previous build; fix schema problems with a **forward** migration; restore from the dump only for data loss. Destructive migrations need a fresh dump and an expand/contract plan.
7. Promotion to a future `production` environment repeats the same steps against production services created on approved paid plans.

## 9. pg-boss worker deployment summary

| Environment | Mode | How |
|---|---|---|
| local | `standalone` (or `embedded`) | `npm run worker` in a second terminal |
| cloud-dev (free) | `embedded` | starts with the web process; sleeps with it; heavy jobs: run a local standalone worker against the same Aiven database instead |
| later (paid) | `standalone` on a Render Background Worker | start command `npm run worker`, same environment variables, web service set to `WORKER_MODE=off` |

Retry, concurrency, idempotency and shutdown rules: `docs/architecture/SYSTEM_ARCHITECTURE.md` section 7 and `FREE_TIER_INFRASTRUCTURE.md` section 4.1.
