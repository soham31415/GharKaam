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
  const { addDays } = await import("../src/lib/domain/dates");
  const profiles = await import("../src/lib/services/profiles");
  const chores = await import("../src/lib/services/chores");
  const { today } = await import("../src/lib/services/clock");
  type ChoreInput = import("../src/lib/validation/chores").ChoreInput;
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
      await db.execute(
        sql`truncate table chore_occurrences, chore_rotation_members, chores, profiles restart identity cascade`,
      );
    }

    console.log("Creating profiles…");
    const mom = await profiles.createFirstProfile({ name: "Mom", avatar: "👩" });
    const dad = await profiles.createProfile(mom, { name: "Dad", avatar: "👨", isAdmin: true });
    const rohan = await profiles.createProfile(mom, { name: "Rohan", avatar: "🧑" });
    const priya = await profiles.createProfile(mom, { name: "Priya", avatar: "👧" });

    const t = today();
    const one = (assigneeId: string): ChoreInput["assignment"] => ({
      mode: "fixed",
      assigneeId,
      rotationIds: [],
      rotationStartId: null,
    });
    const turns = (...ids: string[]): ChoreInput["assignment"] => ({
      mode: "rotation",
      assigneeId: null,
      rotationIds: ids,
      rotationStartId: null,
    });
    const anyone: ChoreInput["assignment"] = { mode: "anyone", assigneeId: null, rotationIds: [], rotationStartId: null };
    const add = (title: string, rest: Omit<ChoreInput, "title" | "notes"> & { notes?: string }) =>
      chores.createChore(mom, { notes: null, ...rest, title });

    console.log("Creating chores…");
    const dishes = await add("Wash dishes", {
      startDate: t,
      spec: { kind: "daily", interval: 1, until: null },
      scheduleMode: "fixed",
      assignment: turns(rohan.id, priya.id),
    });
    const trash = await add("Take out trash", {
      startDate: t,
      spec: { kind: "weekly", interval: 1, weekdays: ["TU", "FR"], until: null },
      scheduleMode: "fixed",
      assignment: one(dad.id),
      notes: "Wet and dry bins separately",
    });
    const plants = await add("Water plants", {
      startDate: t,
      spec: { kind: "daily", interval: 3, until: null },
      scheduleMode: "after_completion",
      assignment: anyone,
    });
    const bathroom = await add("Clean bathroom", {
      startDate: t,
      spec: { kind: "weekly", interval: 1, weekdays: ["SA"], until: null },
      scheduleMode: "fixed",
      assignment: turns(mom.id, dad.id, rohan.id, priya.id),
    });
    await add("Change bedsheets", {
      startDate: t,
      spec: { kind: "weekly", interval: 2, weekdays: ["SU"], until: null },
      scheduleMode: "fixed",
      assignment: one(mom.id),
    });
    await add("Pay electricity bill", {
      startDate: t,
      spec: { kind: "monthly_day", interval: 1, day: 5, until: null },
      scheduleMode: "fixed",
      assignment: one(dad.id),
    });
    await add("Clean the fridge", {
      startDate: t,
      spec: { kind: "monthly_last", interval: 1, until: null },
      scheduleMode: "fixed",
      assignment: anyone,
    });
    await add("Deep clean kitchen", {
      startDate: t,
      spec: { kind: "monthly_nth", interval: 1, nth: 2, weekday: "SA", until: null },
      scheduleMode: "fixed",
      assignment: turns(mom.id, dad.id),
    });
    await add("Service water purifier", {
      startDate: t,
      spec: { kind: "monthly_day", interval: 3, day: 31, until: null },
      scheduleMode: "fixed",
      assignment: one(dad.id),
    });
    await add("Renew car insurance", {
      startDate: t,
      spec: { kind: "yearly", interval: 1, month: 3, day: 15, until: null },
      scheduleMode: "fixed",
      assignment: one(dad.id),
    });
    await add("Fold laundry", {
      startDate: t,
      spec: { kind: "custom", rrule: "FREQ=WEEKLY;BYDAY=MO,WE,FR" },
      scheduleMode: "fixed",
      assignment: one(priya.id),
    });
    await add("Fix leaking tap", {
      startDate: addDays(t, -3),
      spec: { kind: "once" },
      scheduleMode: "fixed",
      assignment: one(dad.id),
    });

    console.log("Making some tasks overdue and adding history…");
    const pendingOf = async (choreId: string) => (await chores.getChoreDetail(choreId))!.next!.id;
    await chores.moveOccurrence(mom, await pendingOf(trash.id), addDays(t, -2));
    await chores.moveOccurrence(mom, await pendingOf(plants.id), addDays(t, -1));
    await chores.closeOccurrence(rohan, await pendingOf(dishes.id), "done"); // next turn: Priya
    await chores.closeOccurrence(mom, await pendingOf(bathroom.id), "skipped"); // next turn: Dad

    console.log("Done. Profiles: Mom & Dad (admins), Rohan, Priya. 12 chores, 3 overdue.");
  } finally {
    await db.$client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
