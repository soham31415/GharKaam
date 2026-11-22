import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { DbOrTx } from "../client";
import {
  choreOccurrences,
  choreRotationMembers,
  chores,
  profiles,
  type ChoreRow,
  type NewChoreRow,
  type NewOccurrenceRow,
  type OccurrenceRow,
} from "../schema";

/** SQL only. Rules live in lib/services and lib/domain. */

// ── Chores ──────────────────────────────────────────────────────────────────

export async function insertChore(db: DbOrTx, values: NewChoreRow): Promise<ChoreRow> {
  const [row] = await db.insert(chores).values(values).returning();
  return row;
}

export async function updateChore(
  db: DbOrTx,
  id: string,
  values: Partial<Omit<NewChoreRow, "id" | "createdAt">>,
): Promise<ChoreRow | undefined> {
  const [row] = await db
    .update(chores)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(chores.id, id))
    .returning();
  return row;
}

export async function findChoreById(db: DbOrTx, id: string): Promise<ChoreRow | undefined> {
  const rows = await db.select().from(chores).where(eq(chores.id, id)).limit(1);
  return rows[0];
}

/** Locks the chore row for the rest of the transaction (serialises edits/completions). */
export async function lockChore(db: DbOrTx, id: string): Promise<ChoreRow | undefined> {
  const rows = await db.select().from(chores).where(eq(chores.id, id)).for("update").limit(1);
  return rows[0];
}

export async function listChoreRows(db: DbOrTx, opts: { archived: boolean }): Promise<ChoreRow[]> {
  return db
    .select()
    .from(chores)
    .where(opts.archived ? isNotNull(chores.archivedAt) : isNull(chores.archivedAt))
    .orderBy(asc(chores.title));
}

// ── Rotation ────────────────────────────────────────────────────────────────

export type RotationRow = { choreId: string; profileId: string; position: number; active: boolean; name: string };

export async function listRotations(db: DbOrTx, choreIds: string[]): Promise<RotationRow[]> {
  if (choreIds.length === 0) return [];
  return db
    .select({
      choreId: choreRotationMembers.choreId,
      profileId: choreRotationMembers.profileId,
      position: choreRotationMembers.position,
      active: sql<boolean>`${profiles.archivedAt} is null`,
      name: profiles.name,
    })
    .from(choreRotationMembers)
    .innerJoin(profiles, eq(profiles.id, choreRotationMembers.profileId))
    .where(inArray(choreRotationMembers.choreId, choreIds))
    .orderBy(asc(choreRotationMembers.choreId), asc(choreRotationMembers.position));
}

export async function replaceRotation(db: DbOrTx, choreId: string, profileIds: string[]): Promise<void> {
  await db.delete(choreRotationMembers).where(eq(choreRotationMembers.choreId, choreId));
  if (profileIds.length > 0) {
    await db
      .insert(choreRotationMembers)
      .values(profileIds.map((profileId, position) => ({ choreId, profileId, position })));
  }
}

// ── Occurrences ─────────────────────────────────────────────────────────────

export async function insertOccurrence(db: DbOrTx, values: NewOccurrenceRow): Promise<OccurrenceRow> {
  const [row] = await db.insert(choreOccurrences).values(values).returning();
  return row;
}

export async function updateOccurrence(
  db: DbOrTx,
  id: string,
  values: Partial<Omit<NewOccurrenceRow, "id" | "choreId" | "createdAt">>,
): Promise<OccurrenceRow | undefined> {
  const [row] = await db.update(choreOccurrences).set(values).where(eq(choreOccurrences.id, id)).returning();
  return row;
}

export async function deleteOccurrence(db: DbOrTx, id: string): Promise<void> {
  await db.delete(choreOccurrences).where(eq(choreOccurrences.id, id));
}

export async function findOccurrenceById(db: DbOrTx, id: string): Promise<OccurrenceRow | undefined> {
  const rows = await db.select().from(choreOccurrences).where(eq(choreOccurrences.id, id)).limit(1);
  return rows[0];
}

export async function findPendingForChore(db: DbOrTx, choreId: string): Promise<OccurrenceRow | undefined> {
  const rows = await db
    .select()
    .from(choreOccurrences)
    .where(and(eq(choreOccurrences.choreId, choreId), eq(choreOccurrences.status, "pending")))
    .limit(1);
  return rows[0];
}

export async function findLatestClosedForChore(db: DbOrTx, choreId: string): Promise<OccurrenceRow | undefined> {
  const rows = await db
    .select()
    .from(choreOccurrences)
    .where(and(eq(choreOccurrences.choreId, choreId), isNotNull(choreOccurrences.closedAt)))
    .orderBy(desc(choreOccurrences.closedAt), desc(choreOccurrences.createdAt))
    .limit(1);
  return rows[0];
}

/** Latest closed occurrence id per chore, for deciding which history rows can be undone. */
export async function latestClosedIdsByChore(db: DbOrTx, choreIds: string[]): Promise<Map<string, string>> {
  if (choreIds.length === 0) return new Map();
  const rows = await db
    .selectDistinctOn([choreOccurrences.choreId], { choreId: choreOccurrences.choreId, id: choreOccurrences.id })
    .from(choreOccurrences)
    .where(and(inArray(choreOccurrences.choreId, choreIds), isNotNull(choreOccurrences.closedAt)))
    .orderBy(choreOccurrences.choreId, desc(choreOccurrences.closedAt), desc(choreOccurrences.createdAt));
  return new Map(rows.map((r) => [r.choreId, r.id]));
}

const assignee = alias(profiles, "assignee");
const closer = alias(profiles, "closer");

/** An occurrence joined with its chore and the people involved. */
export type OccurrenceWithPeople = {
  occurrence: OccurrenceRow;
  choreTitle: string;
  choreNotes: string | null;
  choreArchived: boolean;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  closedByName: string | null;
};

const withPeople = {
  occurrence: choreOccurrences,
  choreTitle: chores.title,
  choreNotes: chores.notes,
  choreArchived: sql<boolean>`${chores.archivedAt} is not null`,
  assigneeName: assignee.name,
  assigneeAvatar: assignee.avatar,
  closedByName: closer.name,
};

function selectWithPeople(db: DbOrTx) {
  return db
    .select(withPeople)
    .from(choreOccurrences)
    .innerJoin(chores, eq(chores.id, choreOccurrences.choreId))
    .leftJoin(assignee, eq(assignee.id, choreOccurrences.assigneeId))
    .leftJoin(closer, eq(closer.id, choreOccurrences.closedBy));
}

/** Open occurrences of active chores due on or before `date`, oldest first. */
export async function listPendingDueBy(db: DbOrTx, date: string): Promise<OccurrenceWithPeople[]> {
  return selectWithPeople(db)
    .where(
      and(eq(choreOccurrences.status, "pending"), lte(choreOccurrences.dueDate, date), isNull(chores.archivedAt)),
    )
    .orderBy(asc(choreOccurrences.dueDate), asc(chores.title));
}

/** Open occurrences for the given chores (one per chore at most). */
export async function listPendingForChores(db: DbOrTx, choreIds: string[]): Promise<OccurrenceWithPeople[]> {
  if (choreIds.length === 0) return [];
  return selectWithPeople(db).where(
    and(eq(choreOccurrences.status, "pending"), inArray(choreOccurrences.choreId, choreIds)),
  );
}

export async function findOccurrenceWithPeople(db: DbOrTx, id: string): Promise<OccurrenceWithPeople | undefined> {
  const rows = await selectWithPeople(db).where(eq(choreOccurrences.id, id)).limit(1);
  return rows[0];
}

/** Closed (done/skipped) occurrences, newest first. */
export async function listClosed(
  db: DbOrTx,
  opts: { limit: number; choreId?: string },
): Promise<OccurrenceWithPeople[]> {
  return selectWithPeople(db)
    .where(
      and(
        isNotNull(choreOccurrences.closedAt),
        opts.choreId ? eq(choreOccurrences.choreId, opts.choreId) : undefined,
      ),
    )
    .orderBy(desc(choreOccurrences.closedAt))
    .limit(opts.limit);
}
