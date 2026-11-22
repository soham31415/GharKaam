import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("Set DIRECT_DATABASE_URL (Supabase session pooler) in .env.local before running drizzle-kit.");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
