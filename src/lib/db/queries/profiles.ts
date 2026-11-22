import "server-only";
import { and, asc, eq, isNotNull, isNull, max, sql } from "drizzle-orm";
import type { DbOrTx } from "../client";
import { profiles, type NewProfileRow, type ProfileRow } from "../schema";

/** SQL only. No business rules here — those live in lib/services. */

export async function listActiveProfiles(db: DbOrTx): Promise<ProfileRow[]> {
  return db
    .select()
    .from(profiles)
    .where(isNull(profiles.archivedAt))
    .orderBy(asc(profiles.sortOrder), asc(profiles.createdAt));
}

export async function listArchivedProfiles(db: DbOrTx): Promise<ProfileRow[]> {
  return db
    .select()
    .from(profiles)
    .where(isNotNull(profiles.archivedAt))
    .orderBy(asc(profiles.name));
}

export async function findProfileById(db: DbOrTx, id: string): Promise<ProfileRow | undefined> {
  const rows = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
  return rows[0];
}

export async function countActiveProfiles(db: DbOrTx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .where(isNull(profiles.archivedAt));
  return row?.n ?? 0;
}

export async function countActiveAdmins(db: DbOrTx): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(profiles)
    .where(and(isNull(profiles.archivedAt), eq(profiles.isAdmin, true)));
  return row?.n ?? 0;
}

export async function findActiveProfileByName(db: DbOrTx, name: string): Promise<ProfileRow | undefined> {
  const rows = await db
    .select()
    .from(profiles)
    .where(and(isNull(profiles.archivedAt), sql`lower(${profiles.name}) = lower(${name})`))
    .limit(1);
  return rows[0];
}

export async function nextProfileSortOrder(db: DbOrTx): Promise<number> {
  const [row] = await db.select({ m: max(profiles.sortOrder) }).from(profiles);
  return (row?.m ?? -1) + 1;
}

export async function insertProfile(db: DbOrTx, values: NewProfileRow): Promise<ProfileRow> {
  const [row] = await db.insert(profiles).values(values).returning();
  return row;
}

export async function updateProfile(
  db: DbOrTx,
  id: string,
  values: Partial<Pick<ProfileRow, "name" | "avatar" | "isAdmin" | "digestEnabled" | "sortOrder" | "archivedAt">>,
): Promise<ProfileRow | undefined> {
  const [row] = await db.update(profiles).set(values).where(eq(profiles.id, id)).returning();
  return row;
}
