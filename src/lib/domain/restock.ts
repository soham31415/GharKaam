/**
 * Restocking rules (pure, no I/O).
 *
 * An item's restock schedule is always counted from its last restock:
 * "every 10 days" bought on the 1st → due on the 11th. The schedule uses the
 * same RRULE engine as chores. Items without a schedule only appear on the
 * shopping list when someone marks them as running low.
 */
import { addDays, daysBetween, formatDate, type DateStr } from "./dates";
import { firstAfter } from "./recurrence";

/**
 * When the item should next be bought, or null when it has no (remaining) schedule.
 * `countedFrom` is the day the current cycle started (normally the last purchase).
 */
export function nextRestockDue(rrule: string | null, countedFrom: DateStr | null, today: DateStr): DateStr | null {
  if (!rrule) return null;
  if (!countedFrom) return today; // never bought: needed now
  return firstAfter(rrule, countedFrom, countedFrom);
}

/** After an edit: recalculate the due date only if the schedule or the last-bought date changed. */
export function nextDueAfterItemEdit(input: {
  rrule: string | null;
  lastRestockedOn: DateStr | null;
  currentNextDue: DateStr | null;
  scheduleChanged: boolean;
  today: DateStr;
}): DateStr | null {
  if (!input.rrule) return null;
  if (!input.scheduleChanged) return input.currentNextDue;
  return nextRestockDue(input.rrule, input.lastRestockedOn, input.today);
}

/**
 * "Not needed this time": count the schedule from today instead, so the item
 * leaves the list until its next turn. The last-bought date is unchanged.
 */
export function postponeRestock(rrule: string | null, today: DateStr): DateStr | null {
  return rrule ? firstAfter(rrule, today, today) : null;
}

export type StockState = { isLow: boolean; nextDueOn: DateStr | null; restockCountedFrom: DateStr | null };

/**
 * Due by its schedule: due today or overdue, or due within the lookahead window
 * (so one trip covers it). Showing up early only applies when the cycle started
 * more than `lookaheadDays` ago; otherwise something bought daily would never
 * leave the list.
 */
export function isDueForRestock(item: StockState, today: DateStr, lookaheadDays: number): boolean {
  if (item.nextDueOn === null) return false;
  if (item.nextDueOn <= today) return true;
  if (item.nextDueOn > addDays(today, lookaheadDays)) return false;
  return item.restockCountedFrom === null || daysBetween(item.restockCountedFrom, today) > lookaheadDays;
}

/** On the shopping list = running low, or due for restocking. */
export function isOnShoppingList(item: StockState, today: DateStr, lookaheadDays: number): boolean {
  return item.isLow || isDueForRestock(item, today, lookaheadDays);
}

/** "Due today", "Due tomorrow", "Due in 3 days", "2 days overdue", "Due Thu 3 Dec". */
export function restockDueLabel(due: DateStr, today: DateStr): string {
  const d = daysBetween(today, due);
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d === -1) return "1 day overdue";
  if (d < 0) return `${-d} days overdue`;
  if (d < 7) return `Due in ${d} days`;
  return `Due ${formatDate(due, today)}`;
}

/** Why an item is on the shopping list, e.g. "Running low (Rohan) · Due tomorrow". */
export function shoppingReason(
  item: StockState & { lowFlaggedByName: string | null },
  today: DateStr,
  lookaheadDays: number,
): string {
  const parts: string[] = [];
  if (item.isLow) parts.push(item.lowFlaggedByName ? `Running low (${item.lowFlaggedByName})` : "Running low");
  if (item.nextDueOn !== null && isDueForRestock(item, today, lookaheadDays)) {
    parts.push(restockDueLabel(item.nextDueOn, today));
  }
  return parts.join(" · ");
}

/** "Last bought today", "Last bought 3 days ago", "Last bought Sun 1 Nov". */
export function lastBoughtLabel(on: DateStr, today: DateStr): string {
  const d = daysBetween(on, today);
  if (d === 0) return "Last bought today";
  if (d === 1) return "Last bought yesterday";
  if (d > 1 && d < 7) return `Last bought ${d} days ago`;
  return `Last bought ${formatDate(on, today)}`;
}

/** Quantities are decimal strings from Postgres ("2.00"). Shows "2 kg", "1.5 L", "500 g". */
export function formatQuantity(quantity: string | null, unit: string | null): string | null {
  if (quantity === null || quantity === "") return null;
  const n = Number(quantity);
  if (!Number.isFinite(n)) return null;
  const text = String(Number(n.toFixed(2)));
  return unit ? `${text} ${unit}` : text;
}
