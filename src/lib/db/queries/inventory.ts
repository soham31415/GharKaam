import "server-only";
import { and, asc, count, desc, eq, inArray, isNotNull, isNull, lte, max, or, sql } from "drizzle-orm";
import type { DbOrTx } from "../client";
import {
  categories,
  inventoryEvents,
  inventoryItems,
  profiles,
  type CategoryRow,
  type InventoryEventRow,
  type InventoryItemRow,
  type NewInventoryEventRow,
  type NewInventoryItemRow,
} from "../schema";

/** SQL only. Rules live in lib/services and lib/domain. */

// ── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(db: DbOrTx): Promise<CategoryRow[]> {
  return db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function countItemsByCategory(db: DbOrTx): Promise<Map<string, number>> {
  const rows = await db
    .select({ categoryId: inventoryItems.categoryId, n: count() })
    .from(inventoryItems)
    .where(and(isNull(inventoryItems.archivedAt), isNotNull(inventoryItems.categoryId)))
    .groupBy(inventoryItems.categoryId);
  return new Map(rows.map((r) => [r.categoryId!, r.n]));
}

export async function findCategoryById(db: DbOrTx, id: string): Promise<CategoryRow | undefined> {
  const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return rows[0];
}

export async function findCategoryByName(db: DbOrTx, name: string): Promise<CategoryRow | undefined> {
  const rows = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${name})`)
    .limit(1);
  return rows[0];
}

export async function nextCategorySortOrder(db: DbOrTx): Promise<number> {
  const [row] = await db.select({ m: max(categories.sortOrder) }).from(categories);
  return (row?.m ?? 0) + 10;
}

export async function insertCategory(db: DbOrTx, values: { name: string; sortOrder: number }): Promise<CategoryRow> {
  const [row] = await db.insert(categories).values(values).returning();
  return row;
}

export async function updateCategory(
  db: DbOrTx,
  id: string,
  values: { name?: string; sortOrder?: number },
): Promise<CategoryRow | undefined> {
  const [row] = await db.update(categories).set(values).where(eq(categories.id, id)).returning();
  return row;
}

export async function deleteCategory(db: DbOrTx, id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

// ── Items ───────────────────────────────────────────────────────────────────

export type ItemWithNames = {
  item: InventoryItemRow;
  categoryName: string | null;
  categorySortOrder: number | null;
  lowFlaggedByName: string | null;
};

function selectItems(db: DbOrTx) {
  return db
    .select({
      item: inventoryItems,
      categoryName: categories.name,
      categorySortOrder: categories.sortOrder,
      lowFlaggedByName: profiles.name,
    })
    .from(inventoryItems)
    .leftJoin(categories, eq(categories.id, inventoryItems.categoryId))
    .leftJoin(profiles, eq(profiles.id, inventoryItems.lowFlaggedBy));
}

export async function listItems(db: DbOrTx, opts: { archived: boolean }): Promise<ItemWithNames[]> {
  return selectItems(db)
    .where(opts.archived ? isNotNull(inventoryItems.archivedAt) : isNull(inventoryItems.archivedAt))
    .orderBy(asc(inventoryItems.name));
}

/** Active items that are flagged low or due on/before `dueBy` (a superset of the shopping list). */
export async function listShoppingCandidates(db: DbOrTx, dueBy: string): Promise<ItemWithNames[]> {
  return selectItems(db)
    .where(
      and(
        isNull(inventoryItems.archivedAt),
        or(eq(inventoryItems.isLow, true), lte(inventoryItems.nextDueOn, dueBy)),
      ),
    )
    .orderBy(asc(inventoryItems.name));
}

export async function findItemWithNames(db: DbOrTx, id: string): Promise<ItemWithNames | undefined> {
  const rows = await selectItems(db).where(eq(inventoryItems.id, id)).limit(1);
  return rows[0];
}

export async function findActiveItemByName(db: DbOrTx, name: string): Promise<InventoryItemRow | undefined> {
  const rows = await db
    .select()
    .from(inventoryItems)
    .where(and(isNull(inventoryItems.archivedAt), sql`lower(${inventoryItems.name}) = lower(${name})`))
    .limit(1);
  return rows[0];
}

/** Locks the rows for the rest of the transaction, in id order so concurrent bulk updates can't deadlock. */
export async function lockItems(db: DbOrTx, ids: string[]): Promise<InventoryItemRow[]> {
  if (ids.length === 0) return [];
  return db
    .select()
    .from(inventoryItems)
    .where(inArray(inventoryItems.id, ids))
    .orderBy(asc(inventoryItems.id))
    .for("update");
}

export async function insertItem(db: DbOrTx, values: NewInventoryItemRow): Promise<InventoryItemRow> {
  const [row] = await db.insert(inventoryItems).values(values).returning();
  return row;
}

export async function updateItem(
  db: DbOrTx,
  id: string,
  values: Partial<Omit<NewInventoryItemRow, "id" | "createdAt">>,
): Promise<InventoryItemRow | undefined> {
  const [row] = await db
    .update(inventoryItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(inventoryItems.id, id))
    .returning();
  return row;
}

// ── Events ──────────────────────────────────────────────────────────────────

export async function insertEvents(db: DbOrTx, values: NewInventoryEventRow[]): Promise<void> {
  if (values.length > 0) await db.insert(inventoryEvents).values(values);
}

export type EventWithName = { event: InventoryEventRow; profileName: string | null };

export async function listEventsForItem(db: DbOrTx, itemId: string, limit: number): Promise<EventWithName[]> {
  return db
    .select({ event: inventoryEvents, profileName: profiles.name })
    .from(inventoryEvents)
    .leftJoin(profiles, eq(profiles.id, inventoryEvents.profileId))
    .where(eq(inventoryEvents.itemId, itemId))
    .orderBy(desc(inventoryEvents.createdAt))
    .limit(limit);
}
