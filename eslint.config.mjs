import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Layering rules (so the UI can be replaced without touching logic):
 *   domain   → imports nothing app-specific (pure functions)
 *   queries  → db only
 *   services → queries + domain
 *   actions  → services (never db directly)
 *   app/     → services for reads, actions for writes (never db)
 *   components → actions + pure domain helpers (never db or services)
 */
const restrict = (patterns) => ({
  "no-restricted-imports": ["error", { patterns: patterns.map((p) => ({ group: [p.group], message: p.message })) }],
});

const noDb = { group: "@/lib/db/*", message: "UI and actions must go through lib/services, not the database." };
const noServices = { group: "@/lib/services/*", message: "Components only render data and call actions." };
const noActions = { group: "@/actions/*", message: "This layer must not depend on server actions." };
const noUi = { group: "@/components/*", message: "This layer must not depend on UI components." };
const noApp = { group: "@/app/*", message: "This layer must not depend on routes." };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/domain/**/*.ts"],
    rules: restrict([
      { group: "@/lib/db/*", message: "domain is pure: no database." },
      { group: "@/lib/services/*", message: "domain is pure: no services." },
      { group: "next/*", message: "domain is pure: no Next.js." },
      noActions,
      noUi,
      noApp,
    ]),
  },
  {
    // Presentation helpers (labels, grouping, filters): pure, like domain.
    files: ["src/lib/view/**/*.ts"],
    rules: restrict([
      { group: "@/lib/db/*", message: "view helpers are pure: no database." },
      { group: "@/lib/services/*", message: "view helpers are pure: no services." },
      { group: "next/*", message: "view helpers are pure: no Next.js." },
      noActions,
      noUi,
      noApp,
    ]),
  },
  {
    files: ["src/lib/db/**/*.ts"],
    rules: restrict([
      { group: "@/lib/services/*", message: "queries must not call services." },
      noActions,
      noUi,
      noApp,
    ]),
  },
  {
    files: ["src/lib/services/**/*.ts"],
    rules: restrict([noActions, noUi, noApp]),
  },
  {
    files: ["src/actions/**/*.ts"],
    rules: restrict([noDb, noUi, noApp]),
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    rules: restrict([noDb]),
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: restrict([noDb, noServices, noApp]),
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "drizzle/**",
    // Third-party agent skills and the design handoff aren't app code.
    ".claude/**",
    ".agents/**",
    "gharkaam-design-handoff/**",
  ]),
]);

export default eslintConfig;
