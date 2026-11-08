# RecallMap: Project Context

Last updated 2026-11-04. Read this first, then `docs/milestones/CURRENT_STATUS.md`.

## What RecallMap is
An adaptive learning and knowledge-retention platform. It helps learners see what they understand, find what they do not yet understand, organize knowledge into a graph of concepts and prerequisites, and decide what to learn or revise next. It is not a chatbot, summarizer, flashcard app, or LMS, and its progress is never based on time spent, streaks, XP, or chapter completion.

**Central loop:** Learning materials -> Knowledge graph -> Learning -> Assessment -> Evidence -> Learner state -> Progress -> Recommendations -> Retention.

## Principles (approved)
1. The knowledge graph (the subject) and learner evidence (what this person has shown) are separate domain concepts and separate tables.
2. Not assessed is not weak. One wrong answer is not a misconception. Inferences stay distinguishable from observations.
3. Learner states are computed by a deterministic, versioned, configurable policy; AI explains and personalizes but never overrides it.
4. Revision status is stored separately from knowledge state.
5. AI-proposed concepts and relationships are reviewable and carry provenance (AI, manual, edited).
6. The tutor distinguishes document-grounded, general-knowledge, and unsupported statements and never fabricates citations.
7. Demo mode is explicit and isolated; an API failure never shows demo data.
8. The backend and database own learner data; the frontend caches but is not a source of truth.

## Current implementation status (verified 2026-11-04)
- **Implemented:** the frontend prototype (landing, auth screens without a backend, dashboard, library, knowledge map, gaps, history, progress, sessions, preferences; all on **hardcoded demo data**) **and the B1a backend foundation** (configuration, logging, errors, identity schema and migration, user-scoped repositories, session service, AI gateway with fakes, object-store interface, pg-boss worker, `GET /api/v1/health`), verified locally on Node 24 and PostgreSQL 16 (not on Aiven). No route uses sessions yet.
- **Not implemented:** authentication flows (OAuth), API routes beyond health, any real AI provider call or adapter, R2 storage, document processing, persistence of learning data, learner-state engine, recommendations, retention.
- **Verified checks (2026-11-07):** typecheck, lint (0 errors), 185 unit/component tests, 34 database integration tests and the production build pass on Node 24.22.2; production dependencies have 0 audit findings. Details: `docs/testing/TEST_EXECUTION_REPORT.md` (ER-004). The Aiven acceptance test has not been run.

## Phase 0 infrastructure (owner decision 2026-11-05)
Aiven free PostgreSQL + Render free web service (embedded worker) + Cloudflare R2 free allowance + Gemini Developer API with **synthetic data only**. No paid service without explicit approval. See `docs/deployment/FREE_TIER_INFRASTRUCTURE.md`.

## Approved technical direction
Next.js API (thin) + separate pg-boss worker; PostgreSQL (Aiven) + Drizzle + pgvector; Cloudflare R2; Zod everywhere; Google OAuth only with opaque hashed server sessions; Gemini behind adapters with a primary key and a conditional secondary key owned by another person (non-personal tasks only, disabled until six gates pass). API must stay extractable from Next.js.

## Where things are
- Architecture: `docs/architecture/` (system, schema, API, AI and documents, learner-state policy, security)
- Deployment, backups, compliance: `docs/deployment/`, `docs/compliance/`
- Testing: `docs/testing/`
- Plan and decisions: `docs/milestones/` (roadmap, decision register, current status)
- Older documents kept for history: `HANDOFF.md`, `MILESTONE_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/API_CONTRACTS.md` (partly superseded, see banners)
