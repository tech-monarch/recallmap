import { defineConfig } from "vitest/config";

/**
 * Integration tests against a real PostgreSQL (TEST_DATABASE_URL, database name must contain "test").
 * Files run one at a time because they share one database.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/server/db/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
