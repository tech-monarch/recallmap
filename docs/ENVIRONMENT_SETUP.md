# RecallMap: Environment Setup

Last updated 2026-11-04. **Current state:** only frontend variables exist in `.env.example` (untracked in Git, see KI-05). The variables below marked Planned do not exist in code yet. Never put real secrets in documentation, commits, or ZIPs.

## Today (frontend prototype)
```bash
npm ci
npm run dev          # http://localhost:3000
npx tsc --noEmit
npx vitest run       # 116 tests passed on 2026-11-04
```
`npm run lint` is broken (KI-01); `npm run build` needs network access to Google Fonts (KI-03).

## Planned variables (validated by Zod at startup)

| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Aiven PostgreSQL connection | TLS required; pool sizes `DB_POOL_MAX_API`, `DB_POOL_MAX_WORKER` |
| `SESSION_SECRET` | server-side secret for cookie/CSRF material | long random value per environment |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | Google sign-in | exact redirect URI registered per environment |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_UPLOADS`, `R2_BUCKET_BACKUPS` | private object storage | separate least-privilege tokens per bucket |
| `GEMINI_API_KEY_PRIMARY` | owner's Gemini key | server only |
| `GEMINI_API_KEY_SECONDARY` | third party's key | unset until gates G1-G6 pass |
| `GEMINI_PRIMARY_ENABLED` / `GEMINI_SECONDARY_ENABLED` | independent switches | secondary default `false` |
| `AI_LEARNER_CONTENT_ENABLED` | allow tutor/grading/personalization in production | default `false` until DR-02 resolved |
| `GEMINI_MODEL`, `GEMINI_EMBEDDING_MODEL` | model names | verify current names at B1 |
| `QUEUE_CONCURRENCY_*`, `AI_BUDGET_*`, `RATE_LIMIT_*` | limits | see roadmap B1 |
| `BACKUP_ENCRYPTION_KEY_ID` | reference to the backup encryption key | key itself stored outside the backups |

Safe example formats (placeholders, not values): `DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require`, `GEMINI_API_KEY_PRIMARY=<set in the host secret store>`.

Frontend-visible variables must start with `NEXT_PUBLIC_` and must **never** hold secrets. Keys and database credentials are server/worker only.

## GitHub access for the assistant
A fine-grained, repository-scoped token provided through a secure session mechanism. Never paste it in chat or commit it. Tokens expire (this one: 30 days); the assistant should warn before expiry.
