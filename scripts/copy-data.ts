/**
 * One-off: copy all app data from the old Supabase project to the new one
 * (used to move the database from Tokyo to Mumbai).
 *
 *   OLD_DIRECT_DATABASE_URL  source  (old project, session pooler, port 5432)
 *   DIRECT_DATABASE_URL      target  (new project, session pooler, port 5432)
 *
 * Run `npm run db:migrate` against the new project first, so its tables exist.
 *
 *   npx tsx scripts/copy-data.ts --dry-run   show what would be copied, change nothing
 *   npx tsx scripts/copy-data.ts             copy (refuses if the new project already has data)
 *   npx tsx scripts/copy-data.ts --replace   wipe the new project's app tables first, then copy
 *
 * Every row keeps its id, so phones keep their selected profile. The copy is one
 * transaction on the new project: it either fully succeeds or changes nothing.
 * The old project is only read, never written.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const REPLACE = args.has("--replace");

function projectRef(url: string): string {
  // Pooler user names look like "postgres.<project-ref>".
  const user = decodeURIComponent(new URL(url).username);
  return user.includes(".") ? user.split(".")[1] : new URL(url).hostname;
}

function describe(url: string): string {
  const u = new URL(url);
  return `${projectRef(url)} (${u.hostname})`;
}

const sourceUrl = process.env.OLD_DIRECT_DATABASE_URL;
const targetUrl = process.env.DIRECT_DATABASE_URL;
if (!sourceUrl || !targetUrl) {
  console.error("Set OLD_DIRECT_DATABASE_URL (old project) and DIRECT_DATABASE_URL (new project) in .env.local.");
  process.exit(1);
}
if (projectRef(sourceUrl) === projectRef(targetUrl)) {
  console.error("OLD_DIRECT_DATABASE_URL and DIRECT_DATABASE_URL point at the same project. Nothing to copy.");
  process.exit(1);
}

const source = postgres(sourceUrl, { prepare: false, max: 1, max_pipeline: 1, onnotice: () => {} });
const target = postgres(targetUrl, { prepare: false, max: 1, max_pipeline: 1, onnotice: () => {} });

type Sql = postgres.Sql | postgres.TransactionSql;
const SAFE_NAME = /^[a-z_][a-z0-9_]*$/;

async function tablesOf(sql: Sql): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    select c.relname as name from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    order by c.relname`;
  return rows.map((r) => r.name);
}

async function columnsOf(sql: Sql, table: string): Promise<string> {
  const rows = await sql<{ col: string }[]>`
    select a.attname || ' ' || format_type(a.atttypid, a.atttypmod) as col
    from pg_attribute a
    where a.attrelid = ${`public.${table}`}::regclass and a.attnum > 0 and not a.attisdropped
    order by a.attnum`;
  return rows.map((r) => r.col).join(", ");
}

async function count(sql: Sql, table: string): Promise<number> {
  const [row] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n from public."${table}"`);
  return row.n;
}

/** Tables ordered so every table comes after the tables it references (self-references are fine). */
async function insertOrder(sql: Sql, tables: string[]): Promise<string[]> {
  const deps = await sql<{ child: string; parent: string }[]>`
    select c.relname as child, p.relname as parent
    from pg_constraint k
    join pg_class c on c.oid = k.conrelid
    join pg_class p on p.oid = k.confrelid
    where k.contype = 'f' and k.connamespace = 'public'::regnamespace and k.conrelid <> k.confrelid`;
  const ordered: string[] = [];
  const pending = new Set(tables);
  while (pending.size > 0) {
    const ready = [...pending].filter((t) => deps.every((d) => d.child !== t || !pending.has(d.parent)));
    if (ready.length === 0) throw new Error(`Circular foreign keys between: ${[...pending].join(", ")}`);
    for (const t of ready.sort()) {
      ordered.push(t);
      pending.delete(t);
    }
  }
  return ordered;
}

async function main() {
  console.log(`From: ${describe(sourceUrl!)}`);
  console.log(`To:   ${describe(targetUrl!)}`);
  console.log(DRY_RUN ? "Dry run: nothing will be written.\n" : "\n");

  const [sourceTables, targetTables] = await Promise.all([tablesOf(source), tablesOf(target)]);
  if (targetTables.length === 0) {
    throw new Error("The new project has no tables yet. Run `npm run db:migrate` first.");
  }
  const missing = sourceTables.filter((t) => !targetTables.includes(t));
  if (missing.length) throw new Error(`The new project is missing tables: ${missing.join(", ")}. Run \`npm run db:migrate\`.`);
  for (const t of sourceTables) {
    if (!SAFE_NAME.test(t)) throw new Error(`Unexpected table name: ${t}`);
    const [a, b] = await Promise.all([columnsOf(source, t), columnsOf(target, t)]);
    if (a !== b) throw new Error(`Table "${t}" has different columns in the two projects:\n  old: ${a}\n  new: ${b}`);
  }

  const order = await insertOrder(target, sourceTables);
  const sourceCounts = new Map<string, number>();
  for (const t of order) sourceCounts.set(t, await count(source, t));
  const targetCounts = new Map<string, number>();
  for (const t of order) targetCounts.set(t, await count(target, t));

  console.table(order.map((t) => ({ table: t, "rows in old": sourceCounts.get(t), "rows in new now": targetCounts.get(t) })));

  const targetHasData = [...targetCounts.values()].some((n) => n > 0);
  if (targetHasData && !REPLACE) {
    throw new Error("The new project already has data. Re-run with --replace to wipe it and copy again.");
  }
  if (DRY_RUN) {
    console.log(`Would copy ${[...sourceCounts.values()].reduce((a, b) => a + b, 0)} rows in this order: ${order.join(" → ")}`);
    return;
  }

  await target.begin(async (tx) => {
    if (REPLACE) {
      await tx.unsafe(`truncate ${order.map((t) => `public."${t}"`).join(", ")} cascade`);
    }
    for (const t of order) {
      // Read as JSON text (no JS type conversion, so dates and numbers stay exact)…
      const [{ data }] = await source.unsafe<{ data: string }[]>(
        `select coalesce(json_agg(t), '[]'::json)::text as data from public."${t}" t`,
      );
      // …and insert in one statement, so rows that point at each other (task → previous task) are fine.
      // ($1 is sent as text: typed as json, the driver would JSON-encode the string a second time.)
      await tx.unsafe(`insert into public."${t}" select * from json_populate_recordset(null::public."${t}", ($1::text)::json)`, [data]);
      const copied = await count(tx, t);
      if (copied !== sourceCounts.get(t)) {
        throw new Error(`"${t}": expected ${sourceCounts.get(t)} rows, found ${copied}. Rolled back; nothing was changed.`);
      }
      console.log(`✓ ${t}: ${copied} rows`);
    }
  });
  console.log("\nDone. Every table in the new project matches the old one.");
}

main()
  .catch((e: unknown) => {
    console.error(`\n✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await Promise.all([source.end({ timeout: 5 }), target.end({ timeout: 5 })]);
  });
