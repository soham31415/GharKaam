/**
 * Presentation helpers for the Today screen. Pure, no React.
 */

import { toUtcDate, type DateStr } from "@/lib/domain/dates";
import type { ShoppingListView } from "@/lib/types";

const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Sunday, 22 Nov" for the small line above the Today title. */
export function longDateLabel(date: DateStr): string {
  const d = toUtcDate(date);
  return `${WEEKDAY_LONG[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}

/** "4 to do · 3 overdue", "1 to do", or "Nothing left for today". */
export function todaySummary(tasks: { isOverdue: boolean }[]): string {
  if (tasks.length === 0) return "Nothing left for today";
  const overdue = tasks.filter((t) => t.isOverdue).length;
  return overdue > 0 ? `${tasks.length} to do · ${overdue} overdue` : `${tasks.length} to do`;
}

/** Due label for a task pill: "Yesterday (overdue)" reads better as "Yesterday · overdue" in a pill. */
export function duePillLabel(dueLabel: string): string {
  return dueLabel.replace(" (overdue)", " · overdue");
}

/** "7 items · Eggs overdue" for the shopping shortcut card. */
export function shoppingSummary(list: Pick<ShoppingListView, "count" | "groups">): string {
  const items = list.groups.flatMap((g) => g.items);
  const count = `${list.count} item${list.count === 1 ? "" : "s"}`;
  const overdue = items.filter((i) => i.isOverdue);
  if (overdue.length > 0) {
    return `${count} · ${overdue[0].name}${overdue.length > 1 ? ` +${overdue.length - 1}` : ""} overdue`;
  }
  const low = items.filter((i) => i.isLow);
  if (low.length > 0) {
    return `${count} · ${low[0].name}${low.length > 1 ? ` +${low.length - 1}` : ""} running low`;
  }
  return count;
}
