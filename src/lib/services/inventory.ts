import "server-only";
import { SHOPPING_LOOKAHEAD_DAYS, TIMEZONE } from "@/lib/config";
import { getDb, type DbOrTx } from "@/lib/db/client";
import * as q from "@/lib/db/queries/inventory";
import type { InventoryItemRow, NewInventoryEventRow } from "@/lib/db/schema";
import { addDays, formatDate, formatTimestamp, type DateStr } from "@/lib/domain/dates";
import { describeSpec, rruleToSpec, specToRRule } from "@/lib/domain/recurrence";
import {
  formatQuantity,
  isDueForRestock,
  isOnShoppingList,
  lastBoughtLabel,
  nextDueAfterItemEdit,
  nextRestockDue,
  postponeRestock,
  restockDueLabel,
  shoppingReason,
} from "@/lib/domain/restock";
import type {
  Category,
  InventoryEventView,
  ItemDetail,
  ItemGroup,
  ItemSummary,
  Profile,
  ShoppingListView,
} from "@/lib/types";
import type { ItemInput } from "@/lib/validation/inventory";
import { today } from "./clock";
import { AppError } from "./errors";
import { assertAdmin } from "./profiles";

const UNCATEGORISED = "Uncategorised";

// ── Views ───────────────────────────────────────────────────────────────────

function scheduleText(item: InventoryItemRow): string {
  if (!item.restockRrule) return item.isOneOff ? "One-off (added to the shopping list)" : "Only when marked running low";
  return `${describeSpec(rruleToSpec(item.restockRrule))}, counted from the last purchase`;
}

function statusText(item: InventoryItemRow, t: DateStr): string {
  if (item.archivedAt) return "Archived";
  if (item.isLow) return "Running low";
  if (item.nextDueOn) return restockDueLabel(item.nextDueOn, t);
  return "In stock";
}

function toSummary(row: q.ItemWithNames, t: DateStr): ItemSummary {
  const item = row.item;
  const stock = { isLow: item.isLow, nextDueOn: item.nextDueOn, restockCountedFrom: item.restockCountedFrom };
  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    categoryName: row.categoryName ?? UNCATEGORISED,
    quantityText: formatQuantity(item.usualQuantity, item.unit),
    scheduleText: scheduleText(item),
    lastBoughtText: item.lastRestockedOn ? lastBoughtLabel(item.lastRestockedOn, t) : null,
    nextDueOn: item.nextDueOn,
    statusText: statusText(item, t),
    isLow: item.isLow,
    lowFlaggedByName: item.isLow ? row.lowFlaggedByName : null,
    isOverdue: item.nextDueOn !== null && item.nextDueOn < t,
    onShoppingList: !item.archivedAt && isOnShoppingList(stock, t, SHOPPING_LOOKAHEAD_DAYS),
    shoppingReason: shoppingReason({ ...stock, lowFlaggedByName: row.lowFlaggedByName }, t, SHOPPING_LOOKAHEAD_DAYS),
    isOneOff: item.isOneOff,
    archived: item.archivedAt !== null,
    notes: item.notes,
  };
}

/** Groups by category in the category order; uncategorised items go last. */
function groupByCategory(rows: q.ItemWithNames[], t: DateStr): ItemGroup[] {
  const groups = new Map<string, ItemGroup & { order: number }>();
  for (const row of rows) {
    const key = row.item.categoryId ?? "";
    let g = groups.get(key);
    if (!g) {
      g = {
        categoryId: row.item.categoryId,
        categoryName: row.categoryName ?? UNCATEGORISED,
        order: row.categorySortOrder ?? Number.MAX_SAFE_INTEGER,
        items: [],
      };
      groups.set(key, g);
    }
    g.items.push(toSummary(row, t));
  }
  return [...groups.values()]
    .sort((a, b) => a.order - b.order || a.categoryName.localeCompare(b.categoryName))
    .map((g) => ({ categoryId: g.categoryId, categoryName: g.categoryName, items: g.items }));
}

function eventText(e: q.EventWithName["event"], unit: string | null): string {
  switch (e.type) {
    case "restocked": {
      const qty = formatQuantity(e.quantity, unit);
      return qty ? `Bought ${qty}` : "Bought";
    }
    case "flagged_low":
      return "Marked running low";
    case "unflagged":
      return e.note ?? "No longer running low";
    case "used":
      return `Used ${formatQuantity(e.quantity, unit) ?? ""}`.trim();
    case "adjusted":
      return e.note ?? "Adjusted";
  }
}

export async function listInventory(opts: { archived: boolean }): Promise<ItemGroup[]> {
  return groupByCategory(await q.listItems(getDb(), opts), today());
}

export async function getShoppingList(): Promise<ShoppingListView> {
  const t = today();
  // The query returns a superset (low, or due within the window); the domain rule decides.
  const candidates = await q.listShoppingCandidates(getDb(), addDays(t, SHOPPING_LOOKAHEAD_DAYS));
  const rows = candidates.filter((r) => isOnShoppingList(r.item, t, SHOPPING_LOOKAHEAD_DAYS));
  return { today: t, count: rows.length, groups: groupByCategory(rows, t) };
}

export async function countShoppingList(): Promise<number> {
  return (await getShoppingList()).count;
}

export async function getItemDetail(id: string): Promise<ItemDetail | null> {
  const db = getDb();
  const row = await q.findItemWithNames(db, id);
  if (!row) return null;
  const t = today();
  const events = await q.listEventsForItem(db, id, 30);
  const item = row.item;
  return {
    ...toSummary(row, t),
    form: {
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      usualQuantity: item.usualQuantity === null ? null : String(Number(item.usualQuantity)),
      notes: item.notes,
      spec: rruleToSpec(item.restockRrule),
      lastRestockedOn: item.lastRestockedOn,
    },
    events: events.map(
      ({ event, profileName }): InventoryEventView => ({
        id: event.id,
        text: eventText(event, item.unit),
        byName: profileName,
        atLabel: formatTimestamp(event.createdAt, TIMEZONE),
      }),
    ),
  };
}

// ── Item changes ────────────────────────────────────────────────────────────

async function assertCategory(db: DbOrTx, categoryId: string | null): Promise<void> {
  if (categoryId && !(await q.findCategoryById(db, categoryId))) {
    throw new AppError("validation", "That category no longer exists.");
  }
}

async function assertUniqueName(db: DbOrTx, name: string, exceptId?: string): Promise<void> {
  const existing = await q.findActiveItemByName(db, name);
  if (existing && existing.id !== exceptId) {
    throw new AppError("validation", `“${existing.name}” is already in the inventory.`);
  }
}

function assertNotFuture(date: DateStr | null, t: DateStr): void {
  if (date && date > t) throw new AppError("validation", "The last-bought date can't be in the future.");
}

async function lockOne(db: DbOrTx, id: string): Promise<InventoryItemRow> {
  const [row] = await q.lockItems(db, [id]);
  if (!row) throw new AppError("not_found", "That item no longer exists.");
  return row;
}

export async function createItem(actor: Profile, input: ItemInput): Promise<{ id: string; name: string }> {
  const t = today();
  assertNotFuture(input.lastRestockedOn, t);
  const rrule = specToRRule(input.spec);
  return getDb().transaction(async (tx) => {
    await assertCategory(tx, input.categoryId);
    await assertUniqueName(tx, input.name);
    const item = await q.insertItem(tx, {
      name: input.name,
      categoryId: input.categoryId,
      unit: input.unit,
      usualQuantity: input.usualQuantity,
      notes: input.notes,
      restockRrule: rrule,
      lastRestockedOn: input.lastRestockedOn,
      restockCountedFrom: input.lastRestockedOn,
      nextDueOn: nextRestockDue(rrule, input.lastRestockedOn, t),
    });
    void actor; // everyone may add items
    return { id: item.id, name: item.name };
  });
}

export async function updateItem(actor: Profile, id: string, input: ItemInput): Promise<void> {
  const t = today();
  assertNotFuture(input.lastRestockedOn, t);
  const rrule = specToRRule(input.spec);
  await getDb().transaction(async (tx) => {
    const before = await lockOne(tx, id);
    if (before.archivedAt) throw new AppError("conflict", "Restore this item before editing it.");
    await assertCategory(tx, input.categoryId);
    await assertUniqueName(tx, input.name, id);

    const lastChanged = input.lastRestockedOn !== before.lastRestockedOn;
    const scheduleChanged = rrule !== before.restockRrule || lastChanged;
    const nextDueOn = nextDueAfterItemEdit({
      rrule,
      lastRestockedOn: input.lastRestockedOn,
      currentNextDue: before.nextDueOn,
      scheduleChanged,
      today: t,
    });
    await q.updateItem(tx, id, {
      name: input.name,
      categoryId: input.categoryId,
      unit: input.unit,
      usualQuantity: input.usualQuantity,
      notes: input.notes,
      restockRrule: rrule,
      lastRestockedOn: input.lastRestockedOn,
      restockCountedFrom: scheduleChanged ? input.lastRestockedOn : before.restockCountedFrom,
      nextDueOn,
      // Editing a quick-added item through the full form makes it a regular inventory item.
      isOneOff: false,
    });
    if (lastChanged) {
      await q.insertEvents(tx, [
        {
          itemId: id,
          type: "adjusted",
          profileId: actor.id,
          note: input.lastRestockedOn
            ? `Last-bought date set to ${formatDate(input.lastRestockedOn, t)}`
            : "Last-bought date cleared",
        },
      ]);
    }
  });
}

/** Mark (or unmark) an item as running low. Unmarking a one-off removes it. */
export async function setLow(actor: Profile, id: string, low: boolean): Promise<void> {
  await getDb().transaction(async (tx) => {
    const item = await lockOne(tx, id);
    if (item.archivedAt) throw new AppError("conflict", "Restore this item first.");
    if (item.isLow === low) return; // someone else already did it
    if (low) {
      await q.updateItem(tx, id, { isLow: true, lowFlaggedBy: actor.id, lowFlaggedAt: new Date() });
      await q.insertEvents(tx, [{ itemId: id, type: "flagged_low", profileId: actor.id }]);
    } else {
      await q.updateItem(tx, id, {
        isLow: false,
        lowFlaggedBy: null,
        lowFlaggedAt: null,
        ...(item.isOneOff ? { archivedAt: new Date() } : {}),
      });
      await q.insertEvents(tx, [{ itemId: id, type: "unflagged", profileId: actor.id }]);
    }
  });
}

/**
 * Mark items as bought today: resets the restock schedule, clears "running low",
 * and archives one-off items. With `fromList`, items that are no longer on the
 * shopping list (someone else just bought them) are skipped.
 */
export async function markBought(
  actor: Profile,
  ids: string[],
  opts: { quantity: string | null; fromList: boolean },
): Promise<{ bought: string[]; skipped: string[] }> {
  const t = today();
  const unique = [...new Set(ids)];
  return getDb().transaction(async (tx) => {
    const rows = await q.lockItems(tx, unique);
    const bought: string[] = [];
    const skipped: string[] = [];
    const events: NewInventoryEventRow[] = [];
    for (const item of rows) {
      const onList = isOnShoppingList(item, t, SHOPPING_LOOKAHEAD_DAYS);
      if (item.archivedAt || (opts.fromList && !onList)) {
        skipped.push(item.name);
        continue;
      }
      await q.updateItem(tx, item.id, {
        lastRestockedOn: t,
        restockCountedFrom: t,
        nextDueOn: nextRestockDue(item.restockRrule, t, t),
        isLow: false,
        lowFlaggedBy: null,
        lowFlaggedAt: null,
        ...(item.isOneOff ? { archivedAt: new Date() } : {}),
      });
      events.push({
        itemId: item.id,
        type: "restocked",
        quantity: (unique.length === 1 ? opts.quantity : null) ?? item.usualQuantity,
        profileId: actor.id,
      });
      bought.push(item.name);
    }
    await q.insertEvents(tx, events);
    return { bought, skipped };
  });
}

/**
 * "Not needed this time": take an item off the shopping list without buying it.
 * Clears "running low" and, if it was due, counts its schedule from today.
 */
export async function notNeeded(actor: Profile, id: string): Promise<{ nextDue: DateStr | null }> {
  const t = today();
  return getDb().transaction(async (tx) => {
    const item = await lockOne(tx, id);
    if (item.archivedAt || !isOnShoppingList(item, t, SHOPPING_LOOKAHEAD_DAYS)) {
      throw new AppError("conflict", `“${item.name}” is already off the list.`);
    }
    const wasDue = isDueForRestock(item, t, SHOPPING_LOOKAHEAD_DAYS);
    const nextDueOn = wasDue ? postponeRestock(item.restockRrule, t) : item.nextDueOn;
    await q.updateItem(tx, id, {
      isLow: false,
      lowFlaggedBy: null,
      lowFlaggedAt: null,
      nextDueOn,
      ...(wasDue ? { restockCountedFrom: t } : {}),
      ...(item.isOneOff ? { archivedAt: new Date() } : {}),
    });
    await q.insertEvents(tx, [{ itemId: id, type: "adjusted", profileId: actor.id, note: "Not needed this time" }]);
    return { nextDue: nextDueOn };
  });
}

/**
 * Quick-add from the shopping list. An existing item with the same name is
 * marked running low; otherwise a one-off item is created (archived once bought).
 */
export async function quickAdd(
  actor: Profile,
  input: { name: string; categoryId: string | null },
): Promise<{ name: string; result: "added" | "flagged" | "already_on_list" }> {
  const t = today();
  return getDb().transaction(async (tx) => {
    const existing = await q.findActiveItemByName(tx, input.name);
    if (existing) {
      const item = await lockOne(tx, existing.id);
      if (isOnShoppingList(item, t, SHOPPING_LOOKAHEAD_DAYS)) return { name: item.name, result: "already_on_list" };
      await q.updateItem(tx, item.id, { isLow: true, lowFlaggedBy: actor.id, lowFlaggedAt: new Date() });
      await q.insertEvents(tx, [{ itemId: item.id, type: "flagged_low", profileId: actor.id }]);
      return { name: item.name, result: "flagged" };
    }
    await assertCategory(tx, input.categoryId);
    const item = await q.insertItem(tx, {
      name: input.name,
      categoryId: input.categoryId,
      isOneOff: true,
      isLow: true,
      lowFlaggedBy: actor.id,
      lowFlaggedAt: new Date(),
    });
    await q.insertEvents(tx, [{ itemId: item.id, type: "flagged_low", profileId: actor.id, note: "Added to the shopping list" }]);
    return { name: item.name, result: "added" };
  });
}

export async function archiveItem(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    const item = await lockOne(tx, id);
    if (item.archivedAt) throw new AppError("conflict", "That item is already archived.");
    await q.updateItem(tx, id, { archivedAt: new Date() });
  });
}

export async function restoreItem(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    const item = await lockOne(tx, id);
    if (!item.archivedAt) throw new AppError("conflict", "That item isn't archived.");
    await assertUniqueName(tx, item.name, id);
    await q.updateItem(tx, id, { archivedAt: null });
  });
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function listCategories(): Promise<Category[]> {
  const db = getDb();
  const [rows, counts] = await Promise.all([q.listCategories(db), q.countItemsByCategory(db)]);
  return rows.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder, itemCount: counts.get(c.id) ?? 0 }));
}

async function assertUniqueCategory(db: DbOrTx, name: string, exceptId?: string): Promise<void> {
  const existing = await q.findCategoryByName(db, name);
  if (existing && existing.id !== exceptId) throw new AppError("validation", `There is already a “${existing.name}” category.`);
}

export async function createCategory(actor: Profile, input: { name: string; sortOrder: number | null }): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    await assertUniqueCategory(tx, input.name);
    await q.insertCategory(tx, { name: input.name, sortOrder: input.sortOrder ?? (await q.nextCategorySortOrder(tx)) });
  });
}

export async function updateCategory(
  actor: Profile,
  id: string,
  input: { name: string; sortOrder: number | null },
): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    await assertUniqueCategory(tx, input.name, id);
    const row = await q.updateCategory(tx, id, { name: input.name, ...(input.sortOrder !== null ? { sortOrder: input.sortOrder } : {}) });
    if (!row) throw new AppError("not_found", "That category no longer exists.");
  });
}

/** Items in a deleted category become uncategorised. */
export async function deleteCategory(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await q.deleteCategory(getDb(), id);
}
