/**
 * npm run db:check
 * Connects with DATABASE_URL and DIRECT_DATABASE_URL and explains what's wrong
 * in plain words (the app's own errors only say "Failed query").
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const HINTS: [RegExp, string][] = [
  [/ECONNREFUSED/, "Nothing is listening at that host/port. Check the URL (Supabase pooler host, port 6543 or 5432)."],
  [/ENOTFOUND|EAI_AGAIN/, "The host name doesn't resolve. Copy the pooler string from Supabase → Connect again."],
  [/ETIMEDOUT|ENETUNREACH|timeout/i, "Can't reach the host. If you used the 'Direct connection' string, switch to the pooler strings (direct is IPv6-only on the free plan)."],
  [/password authentication failed/i, "Wrong database password. Reset it in Supabase → Project Settings → Database, then update both URLs."],
  [/Tenant or user not found/i, "Pooler URLs need the user as postgres.<project-ref>, not just postgres."],
  [/self[- ]signed|certificate/i, "TLS problem. Make sure you're using the Supabase pooler host as given."],
];

function hint(message: string): string {
  return HINTS.find(([re]) => re.test(message))?.[1] ?? "See the error above.";
}

function describe(url: string): string {
  try {
    const u = new URL(url);
    return `${u.username}@${u.hostname}:${u.port || 5432}${u.pathname}`;
  } catch {
    return "(not a valid URL)";
  }
}

async function check(name: string, url: string | undefined): Promise<boolean> {
  if (!url || url.includes("<")) {
    console.log(`✗ ${name}: not set (or still the example placeholder). Fill it in .env.local.`);
    return false;
  }
  const sql = postgres(url, { prepare: false, connect_timeout: 10, max: 1 });
  try {
    await sql`select 1`;
    const [{ profiles }] = await sql<{ profiles: string | null }[]>`select to_regclass('public.profiles')::text as profiles`;
    if (!profiles) {
      console.log(`! ${name}: connected to ${describe(url)}, but tables are missing. Run: npm run db:migrate`);
    } else {
      console.log(`✓ ${name}: connected to ${describe(url)} and tables exist.`);
    }
    return true;
  } catch (e) {
    const message = e instanceof Error ? `${(e as { code?: string }).code ?? ""} ${e.message}`.trim() : String(e);
    console.log(`✗ ${name}: ${describe(url)}\n    ${message}\n    → ${hint(message)}`);
    return false;
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function main() {
  const results = [
    await check("DATABASE_URL (app, transaction pooler)", process.env.DATABASE_URL),
    await check("DIRECT_DATABASE_URL (migrations, session pooler)", process.env.DIRECT_DATABASE_URL),
  ];
  process.exitCode = results.every(Boolean) ? 0 : 1;
}

void main();
