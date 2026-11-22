/**
 * Sample data for testing.
 *
 *   npm run seed            # only runs on an empty database
 *   npm run seed -- --reset # WIPES all app data first, then seeds
 *
 * Runs with `--conditions=react-server` so it can reuse the real services
 * (and therefore the same rules as the app). Uses DIRECT_DATABASE_URL.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
config({ quiet: true });
if (process.env.DIRECT_DATABASE_URL) process.env.DATABASE_URL = process.env.DIRECT_DATABASE_URL;

const reset = process.argv.includes("--reset");

async function main() {
  const { sql } = await import("drizzle-orm");
  const { getDb } = await import("../src/lib/db/client");
  const profiles = await import("../src/lib/services/profiles");
  const db = getDb();

  try {
    const existing = await profiles.listActiveProfiles();
    if (existing.length > 0 && !reset) {
      console.error("The database already has data. Re-run with `npm run seed -- --reset` to wipe it first.");
      process.exitCode = 1;
      return;
    }
    if (reset) {
      console.log("Wiping all app data…");
      await db.execute(sql`truncate table profiles restart identity cascade`);
    }

    console.log("Creating profiles…");
    const mom = await profiles.createFirstProfile({ name: "Mom", avatar: "👩" });
    await profiles.createProfile(mom, { name: "Dad", avatar: "👨", isAdmin: true });
    await profiles.createProfile(mom, { name: "Rohan", avatar: "🧑" });
    await profiles.createProfile(mom, { name: "Priya", avatar: "👧" });

    console.log("Done. Profiles: Mom (admin), Dad (admin), Rohan, Priya.");
  } finally {
    await db.$client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
