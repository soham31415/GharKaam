import { maxDate, type DateStr } from "./dates";
import { firstAfter, firstOnOrAfter, upcomingDates } from "./recurrence";
import { keepOrAdvanceRotationIndex, nextRotationIndex, type RotationMember } from "./rotation";

/**
 * Planning rules for chore occurrences. Pure: given the chore and today's
 * date, decide what the open (pending) occurrence should be. Services apply
 * the result to the database.
 *
 * Invariant: each active chore has at most one pending occurrence, so missed
 * dates never pile up.
 */

export type ScheduleMode = "fixed" | "after_completion";
export type AssignmentMode = "fixed" | "rotation" | "anyone";

export type ChoreSchedule = {
  /** RRULE body, or null for a one-time chore. */
  rrule: string | null;
  /** First due date; also the anchor for "fixed" schedules. */
  startDate: DateStr;
  scheduleMode: ScheduleMode;
};

export type ChoreAssignment = {
  mode: AssignmentMode;
  /** For "fixed": who always does it. */
  assigneeId: string | null;
  /** For "rotation": ordered members. */
  rotation: readonly RotationMember[];
  /** Ids of profiles that are currently active (archived people get nothing). */
  activeProfileIds: ReadonlySet<string>;
};

export type PlannedOccurrence = {
  dueDate: DateStr;
  /** null = "anyone". */
  assigneeId: string | null;
  rotationIndex: number | null;
};

type Assigned = Pick<PlannedOccurrence, "assigneeId" | "rotationIndex">;

function assignFromRotation(assignment: ChoreAssignment, index: number | null): Assigned {
  if (index === null) return { assigneeId: null, rotationIndex: null };
  return { assigneeId: assignment.rotation[index].profileId, rotationIndex: index };
}

function assignNonRotation(assignment: ChoreAssignment): Assigned {
  if (assignment.mode === "fixed" && assignment.assigneeId && assignment.activeProfileIds.has(assignment.assigneeId)) {
    return { assigneeId: assignment.assigneeId, rotationIndex: null };
  }
  return { assigneeId: null, rotationIndex: null };
}

/** The first occurrence of a newly created chore. */
export function planFirstOccurrence(
  schedule: ChoreSchedule,
  assignment: ChoreAssignment,
  today: DateStr,
  rotationStartIndex = 0,
): PlannedOccurrence | null {
  const dueDate =
    schedule.rrule === null
      ? schedule.startDate
      : firstOnOrAfter(schedule.rrule, schedule.startDate, maxDate(schedule.startDate, today));
  if (!dueDate) return null;
  const who =
    assignment.mode === "rotation"
      ? assignFromRotation(assignment, nextRotationIndex(assignment.rotation, null, rotationStartIndex))
      : assignNonRotation(assignment);
  return { dueDate, ...who };
}

export type ClosedOccurrence = {
  dueDate: DateStr;
  rotationIndex: number | null;
};

/**
 * The occurrence that follows one being marked done or skipped on `today`.
 * - fixed: next scheduled date after max(due, today) — a late catch-up doesn't
 *   create a task that's immediately due again.
 * - after_completion: the schedule restarts from today (every 3 days → today + 3).
 * Rotation advances from the closed occurrence's *planned* position.
 */
export function planNextOccurrence(
  schedule: ChoreSchedule,
  assignment: ChoreAssignment,
  closed: ClosedOccurrence,
  today: DateStr,
): PlannedOccurrence | null {
  if (schedule.rrule === null) return null;
  const dueDate =
    schedule.scheduleMode === "fixed"
      ? firstAfter(schedule.rrule, schedule.startDate, maxDate(closed.dueDate, today))
      : firstAfter(schedule.rrule, today, today);
  if (!dueDate) return null;
  const who =
    assignment.mode === "rotation"
      ? assignFromRotation(assignment, nextRotationIndex(assignment.rotation, closed.rotationIndex))
      : assignNonRotation(assignment);
  return { dueDate, ...who };
}

/**
 * After the chore itself is edited: what the open occurrence should become.
 * History is never touched, and only what changed is recalculated — fixing a
 * title keeps a manually moved or overdue due date as it is.
 * @param pending current open occurrence (if any)
 * @param lastClosedOn date the most recent occurrence was closed (for "after last done")
 */
export function planAfterChoreEdit(input: {
  schedule: ChoreSchedule;
  assignment: ChoreAssignment;
  pending: PlannedOccurrence | null;
  lastClosedOn: DateStr | null;
  today: DateStr;
  scheduleChanged: boolean;
  assignmentChanged: boolean;
}): PlannedOccurrence | null {
  const { schedule, assignment, pending, lastClosedOn, today, scheduleChanged, assignmentChanged } = input;
  // A finished chore only comes back if its schedule changed.
  if (!pending && !scheduleChanged) return null;

  let dueDate: DateStr | null;
  if (pending && !scheduleChanged) {
    dueDate = pending.dueDate;
  } else if (schedule.rrule === null) {
    dueDate = schedule.startDate;
  } else if (schedule.scheduleMode === "after_completion" && lastClosedOn) {
    dueDate = firstAfter(schedule.rrule, lastClosedOn, lastClosedOn);
  } else {
    dueDate = firstOnOrAfter(schedule.rrule, schedule.startDate, maxDate(schedule.startDate, today));
  }
  if (!dueDate) return null;

  let who: Assigned;
  if (pending && !assignmentChanged) {
    who = { assigneeId: pending.assigneeId, rotationIndex: pending.rotationIndex };
  } else if (assignment.mode === "rotation") {
    who = assignFromRotation(assignment, keepOrAdvanceRotationIndex(assignment.rotation, pending?.rotationIndex ?? null));
  } else {
    who = assignNonRotation(assignment);
  }
  return { dueDate, ...who };
}

export type UndoCheck =
  | { ok: true; deletePendingId: string | null }
  | { ok: false; reason: string };

/**
 * Undo is allowed only for the chore's most recently closed occurrence, and
 * only while the occurrence it spawned is still the open one.
 */
export function checkUndo(input: {
  target: { id: string; status: "pending" | "done" | "skipped" };
  latestClosedId: string | null;
  pending: { id: string; previousOccurrenceId: string | null } | null;
}): UndoCheck {
  const { target, latestClosedId, pending } = input;
  if (target.status === "pending") return { ok: false, reason: "This task is still open." };
  if (latestClosedId !== target.id) return { ok: false, reason: "Only the most recent done/skip of a chore can be undone." };
  if (pending && pending.previousOccurrenceId !== target.id) {
    return { ok: false, reason: "The chore's schedule changed since then, so this can't be undone." };
  }
  return { ok: true, deletePendingId: pending?.id ?? null };
}

/**
 * Due dates to preview in the chore form. For "after last done" only the first
 * date is knowable; later ones depend on when it actually gets done.
 */
export function previewDueDates(schedule: ChoreSchedule, today: DateStr, count = 5): DateStr[] {
  if (schedule.rrule === null) return [schedule.startDate];
  const from = maxDate(schedule.startDate, today);
  if (schedule.scheduleMode === "after_completion") {
    const first = firstOnOrAfter(schedule.rrule, schedule.startDate, from);
    return first ? [first] : [];
  }
  return upcomingDates(schedule.rrule, schedule.startDate, from, count);
}
