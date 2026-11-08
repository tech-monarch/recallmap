# RecallMap
Understand more. Remember what matters. See HANDOFF.md and MILESTONE_STATUS.md.

## Development
Node 24 (see `.nvmrc`). `npm ci`, then `npm run dev`. Checks: `npm run validate` (typecheck, lint, tests, cycle check), `npm run test:db` (needs a test PostgreSQL), `npm run build`. Copy `.env.example` to `.env.local` for backend settings; the frontend still runs with no environment.

## Documentation
Start with `PROJECT_CONTEXT.md`, then `docs/milestones/CURRENT_STATUS.md`. Architecture, schema, API, AI, security, deployment, compliance, testing, roadmap and the decision register are under `docs/`. Only the frontend prototype is implemented; everything else is planned.
