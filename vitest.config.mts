import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      // Next.js handles `server-only` natively at build time; tests need a no-op stand-in.
      "server-only": path.resolve(import.meta.dirname, "tests/helpers/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}"],
    // Database tests need a real PostgreSQL and run through `npm run test:db` (vitest.db.config.mts).
    exclude: [...configDefaults.exclude, "tests/server/db/**"],
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
  },
});
