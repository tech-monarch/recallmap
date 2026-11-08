import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Architecture boundaries (docs/architecture/SYSTEM_ARCHITECTURE.md section 3).
const frontendGlobs = ["**/components/**", "**/hooks/**", "**/app/**", "**/lib/recallmap/**"];
const uiPackages = ["react", "react-dom", "next", "next/*"];
const modules = ["auth", "users", "preferences"];

const moduleInternalRules = modules.map((mod) => ({
  files: [`src/server/modules/${mod}/**/*.ts`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          { group: uiPackages, message: "Server code must not depend on React or Next.js." },
          { group: frontendGlobs, message: "Server code must not import frontend modules." },
          ...modules
            .filter((other) => other !== mod)
            .map((other) => ({
              group: [`../${other}/repository*`, `../${other}/*-repository*`],
              message: `Modules talk through services, not another module's repository (${other}).`,
            })),
        ],
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/contracts/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: uiPackages, message: "Contracts must not depend on React or Next.js." },
            { group: frontendGlobs, message: "Contracts must not import frontend modules." },
            { group: ["**/server/**"], message: "Contracts must not import server code." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/**/*.ts", "worker/**/*.ts"],
    ignores: ["src/server/modules/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: uiPackages, message: "Server code must not depend on React or Next.js." },
            { group: frontendGlobs, message: "Server code must not import frontend modules." },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/modules/shared.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: uiPackages, message: "Server code must not depend on React or Next.js." }, { group: frontendGlobs, message: "Server code must not import frontend modules." }] }],
    },
  },
  ...moduleInternalRules,
  // Override default ignores of eslint-config-next.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**"]),
]);

export default eslintConfig;
