import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDbEnv } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };
/** A Drizzle transaction handle; query functions accept either this or `db`. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DbOrTx = Database | Tx;

const globalForDb = globalThis as unknown as { gharkaamDb?: Database };

function createDb(): Database {
  const client = postgres(getDbEnv().DATABASE_URL, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    // Serverless functions: keep the pool tiny and let idle connections go.
    max: 3,
    idle_timeout: 20,
  });
  return drizzle(client, { schema });
}

/** Lazily created so importing this module never needs env vars (e.g. during `next build`). */
export function getDb(): Database {
  if (!globalForDb.gharkaamDb) {
    globalForDb.gharkaamDb = createDb();
  }
  return globalForDb.gharkaamDb;
}
