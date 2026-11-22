/**
 * Presentation helpers for the Chores list. Pure, no React.
 */

import { addDays, toUtcDate, type DateStr } from "@/lib/domain/dates";
import type { ChoreSummary } from "@/lib/types";

export type ChoreGroupKey = "overdue" | "week" | "later" | "finished" | "archived";
export type ChoreGroup = { key: ChoreGroupKey; label: string; chores: ChoreSummary[] };

const LABELS: Record<ChoreGroupKey, string> = {
  overdue: "Overdue",
  week: "This week",
  later: "Later",
  finished: "No upcoming date",
  archived: "Archived",
};

/**
 * Overdue / This week (today and the next 6 days) / Later / No upcoming date.
 * Archived chores go in one group. Order inside a group is kept (the service sorts by due date).
 */
export function groupChores(chores: ChoreSummary[], today: DateStr): ChoreGroup[] {
  const weekEnd = addDays(today, 6);
  const keyOf = (c: ChoreSummary): ChoreGroupKey => {
    if (c.archived) return "archived";
    if (!c.next) return "finished";
    if (c.next.dueDate < today) return "overdue";
    return c.next.dueDate <= weekEnd ? "week" : "later";
  };
  const order: ChoreGroupKey[] = ["overdue", "week", "later", "finished", "archived"];
  return order
    .map((key) => ({ key, label: LABELS[key], chores: chores.filter((c) => keyOf(c) === key) }))
    .filter((g) => g.chores.length > 0);
}

const DOW = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * The date tile on a chore row: weekday plus day number, "TODAY" for today,
 * "—" when there's no date. More than four weeks away, the month replaces the
 * weekday ("MAR 15"), since a weekday alone would be ambiguous.
 */
export function dateTile(due: DateStr | null, today: DateStr): { top: string; day: string; tone: "danger" | "soon" | "neutral" } {
  if (!due) return { top: "", day: "—", tone: "neutral" };
  const d = toUtcDate(due);
  const tone = due < today ? "danger" : due === today ? "soon" : "neutral";
  const top = due === today ? "TODAY" : due > addDays(today, 27) ? MON[d.getUTCMonth()] : DOW[d.getUTCDay()];
  return { top, day: String(d.getUTCDate()), tone };
}

/** Small badge next to the title: overdue state, "Finished" or "Archived". Null when the date tile says enough. */
export function choreBadge(c: ChoreSummary): { text: string; tone: "danger" | "neutral" } | null {
  if (c.archived) return { text: "Archived", tone: "neutral" };
  if (!c.next) return { text: "Finished", tone: "neutral" };
  if (c.next.isOverdue) return { text: c.next.dueLabel.replace(" (overdue)", ""), tone: "danger" };
  return null;
}

/** "Dad", "Anyone", "Takes turns · next: Priya", "Dad · this time: Rohan". */
export function whoText(c: ChoreSummary): string {
  const nextName = c.next?.assignee?.name ?? null;
  if (c.assignmentMode === "anyone") {
    return nextName ? `Anyone · this time: ${nextName}` : "Anyone";
  }
  if (c.assignmentMode === "rotation") {
    if (!c.next) return "Takes turns";
    return `Takes turns · next: ${nextName ?? "anyone"}`;
  }
  const owner = c.people[0]?.name ?? c.assignmentText;
  if (c.next && nextName !== owner) return `${owner} · this time: ${nextName ?? "anyone"}`;
  return owner;
}
