/**
 * Plain data shapes (DTOs) that services return and the UI renders.
 * Kept separate from DB rows so the frontend can be replaced without touching
 * the database layer.
 */

import type { DateStr } from "@/lib/domain/dates";
import type { AssignmentMode, ScheduleMode } from "@/lib/domain/occurrences";
import type { RecurrenceSpec } from "@/lib/domain/recurrence";

export type Profile = {
  id: string;
  name: string;
  avatar: string | null;
  isAdmin: boolean;
  digestEnabled: boolean;
  archived: boolean;
};

export type PersonRef = { id: string; name: string; avatar: string | null };

export type OccurrenceStatus = "pending" | "done" | "skipped";

/** One task: a single due date of a chore. */
export type OccurrenceView = {
  id: string;
  choreId: string;
  choreTitle: string;
  choreNotes: string | null;
  dueDate: DateStr;
  /** "Today", "3 days overdue", "Thu 26 Nov"… */
  dueLabel: string;
  isOverdue: boolean;
  /** null = anyone */
  assignee: PersonRef | null;
  status: OccurrenceStatus;
  closedByName: string | null;
  /** Formatted in IST, e.g. "Sun, 22 Nov, 7:45 pm". */
  closedLabel: string | null;
  canUndo: boolean;
};

export type ChoreSummary = {
  id: string;
  title: string;
  notes: string | null;
  scheduleText: string;
  scheduleMode: ScheduleMode;
  assignmentMode: AssignmentMode;
  /** "Rohan", "Anyone", or "Rotates: Mom → Dad → Rohan" */
  assignmentText: string;
  /** Who's involved, in order: the rotation members, or the one assignee. Empty for "anyone". */
  people: PersonRef[];
  archived: boolean;
  /** The open task, or null if the chore is finished / archived. */
  next: OccurrenceView | null;
};

/** Values to pre-fill the chore form when editing. */
export type ChoreFormValues = {
  title: string;
  notes: string | null;
  startDate: DateStr;
  spec: RecurrenceSpec;
  scheduleMode: ScheduleMode;
  assignmentMode: AssignmentMode;
  assigneeId: string | null;
  rotationIds: string[];
};

export type ChoreDetail = ChoreSummary & {
  form: ChoreFormValues;
  history: OccurrenceView[];
};

export type TodayView = {
  today: DateStr;
  todayLabel: string;
  mine: OccurrenceView[];
  anyone: OccurrenceView[];
  others: OccurrenceView[];
  /** Everyone's tasks due tomorrow (read-only preview). */
  tomorrow: OccurrenceView[];
};

// ── Inventory ───────────────────────────────────────────────────────────────

export type Category = { id: string; name: string; sortOrder: number; itemCount: number };

export type ItemSummary = {
  id: string;
  name: string;
  categoryId: string | null;
  /** "Uncategorised" when none. */
  categoryName: string;
  /** "2 kg", or null when no usual quantity is set. */
  quantityText: string | null;
  /** "Every 7 days, counted from the last purchase" or "Only when marked running low". */
  scheduleText: string;
  /** "Last bought 3 days ago", or null if never bought. */
  lastBoughtText: string | null;
  nextDueOn: DateStr | null;
  /** "Running low", "Due tomorrow", "3 days overdue", "In stock"… */
  statusText: string;
  isLow: boolean;
  lowFlaggedByName: string | null;
  isOverdue: boolean;
  onShoppingList: boolean;
  /** Why it's on the shopping list, e.g. "Running low (Rohan) · Due tomorrow". */
  shoppingReason: string;
  isOneOff: boolean;
  archived: boolean;
  notes: string | null;
};

export type ItemGroup = { categoryId: string | null; categoryName: string; items: ItemSummary[] };

/** Values to pre-fill the item form when editing. */
export type ItemFormValues = {
  name: string;
  categoryId: string | null;
  unit: string | null;
  usualQuantity: string | null;
  notes: string | null;
  spec: RecurrenceSpec;
  lastRestockedOn: DateStr | null;
};

export type InventoryEventView = {
  id: string;
  /** "Bought 2 kg", "Marked running low", "Not needed this time"… */
  text: string;
  byName: string | null;
  atLabel: string;
};

export type ItemDetail = ItemSummary & { form: ItemFormValues; events: InventoryEventView[] };

export type ShoppingListView = { today: DateStr; count: number; groups: ItemGroup[] };
