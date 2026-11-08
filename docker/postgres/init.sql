-- Runs once on first start of the local database container (superuser context).
CREATE DATABASE recallmap_test OWNER recallmap;
\connect recallmap_dev
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
\connect recallmap_test
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
