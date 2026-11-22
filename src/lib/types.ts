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
};
