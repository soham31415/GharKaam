import { describe, expect, it } from "vitest";
import {
  checkUndo,
  planAfterChoreEdit,
  planFirstOccurrence,
  planNextOccurrence,
  previewDueDates,
  type ChoreAssignment,
  type ChoreSchedule,
} from "./occurrences";

// Sun 22 Nov 2026
const TODAY = "2026-11-22";

const fixed = (rrule: string | null, startDate = "2026-11-01"): ChoreSchedule => ({
  rrule,
  startDate,
  scheduleMode: "fixed",
});
const afterDone = (rrule: string, startDate = "2026-11-01"): ChoreSchedule => ({
  rrule,
  startDate,
  scheduleMode: "after_completion",
});

const everyone = new Set(["A", "B", "C"]);
const toA: ChoreAssignment = { mode: "fixed", assigneeId: "A", rotation: [], activeProfileIds: everyone };
const anyone: ChoreAssignment = { mode: "anyone", assigneeId: null, rotation: [], activeProfileIds: everyone };
const rotateABC: ChoreAssignment = {
  mode: "rotation",
  assigneeId: null,
  rotation: ["A", "B", "C"].map((id) => ({ profileId: id, active: true })),
  activeProfileIds: everyone,
};

describe("planFirstOccurrence", () => {
  it("one-time chores are due on their start date", () => {
    expect(planFirstOccurrence(fixed(null, "2026-11-25"), toA, TODAY)).toEqual({
      dueDate: "2026-11-25",
      assigneeId: "A",
      rotationIndex: null,
    });
  });

  it("a start date in the past begins today, not with a backlog", () => {
    expect(planFirstOccurrence(fixed("FREQ=DAILY"), toA, TODAY)?.dueDate).toBe(TODAY);
  });

  it("a future start date is respected", () => {
    expect(planFirstOccurrence(fixed("FREQ=DAILY", "2026-12-01"), toA, TODAY)?.dueDate).toBe("2026-12-01");
  });

  it("weekly picks the next matching weekday", () => {
    expect(planFirstOccurrence(fixed("FREQ=WEEKLY;BYDAY=TU"), toA, TODAY)?.dueDate).toBe("2026-11-24");
  });

  it("rotation starts with the first (or chosen) member", () => {
    expect(planFirstOccurrence(fixed("FREQ=DAILY"), rotateABC, TODAY)).toMatchObject({ assigneeId: "A", rotationIndex: 0 });
    expect(planFirstOccurrence(fixed("FREQ=DAILY"), rotateABC, TODAY, 2)).toMatchObject({ assigneeId: "C", rotationIndex: 2 });
  });

  it("'anyone' chores and archived fixed assignees have no assignee", () => {
    expect(planFirstOccurrence(fixed("FREQ=DAILY"), anyone, TODAY)?.assigneeId).toBeNull();
    const archivedA = { ...toA, activeProfileIds: new Set(["B"]) };
    expect(planFirstOccurrence(fixed("FREQ=DAILY"), archivedA, TODAY)?.assigneeId).toBeNull();
  });

  it("returns null if the series already ended", () => {
    expect(planFirstOccurrence(fixed("FREQ=DAILY;UNTIL=20261110T000000Z"), toA, TODAY)).toBeNull();
  });
});

describe("planNextOccurrence: fixed calendar", () => {
  const tuesdays = fixed("FREQ=WEEKLY;BYDAY=TU");

  it("done on time → next scheduled date", () => {
    expect(planNextOccurrence(tuesdays, toA, { dueDate: "2026-11-24", rotationIndex: null }, "2026-11-24")?.dueDate).toBe(
      "2026-12-01",
    );
  });

  it("done late → next scheduled date after today (missed dates collapse)", () => {
    // due Tue 17 Nov, done Sun 22 Nov → Tue 24 Nov, not the missed one
    expect(planNextOccurrence(tuesdays, toA, { dueDate: "2026-11-17", rotationIndex: null }, TODAY)?.dueDate).toBe(
      "2026-11-24",
    );
  });

  it("daily chore caught up late isn't instantly due again", () => {
    // due Thu 19, done Sun 22 → Mon 23
    expect(
      planNextOccurrence(fixed("FREQ=DAILY"), toA, { dueDate: "2026-11-19", rotationIndex: null }, TODAY)?.dueDate,
    ).toBe("2026-11-23");
  });

  it("done early → the date after the one that was due", () => {
    // due Tue 24, done Sun 22 → Tue 1 Dec
    expect(planNextOccurrence(tuesdays, toA, { dueDate: "2026-11-24", rotationIndex: null }, TODAY)?.dueDate).toBe(
      "2026-12-01",
    );
  });

  it("keeps the calendar anchor for every-N-days", () => {
    // every 3 days from 1 Nov: 1, 4, ..., 19, 22, 25 — done late on 22 for the 19th → 25
    expect(
      planNextOccurrence(fixed("FREQ=DAILY;INTERVAL=3"), toA, { dueDate: "2026-11-19", rotationIndex: null }, TODAY)
        ?.dueDate,
    ).toBe("2026-11-25");
  });

  it("one-time and ended series have no next occurrence", () => {
    expect(planNextOccurrence(fixed(null), toA, { dueDate: TODAY, rotationIndex: null }, TODAY)).toBeNull();
    expect(
      planNextOccurrence(fixed("FREQ=DAILY;UNTIL=20261122T000000Z"), toA, { dueDate: TODAY, rotationIndex: null }, TODAY),
    ).toBeNull();
  });
});

describe("planNextOccurrence: after last done", () => {
  it("restarts the interval from the day it was done", () => {
    const every3 = afterDone("FREQ=DAILY;INTERVAL=3");
    // due 19th, done late on the 22nd → 25th
    expect(planNextOccurrence(every3, toA, { dueDate: "2026-11-19", rotationIndex: null }, TODAY)?.dueDate).toBe(
      "2026-11-25",
    );
    // due 25th, done early on the 22nd → 25th as well (3 days after done)
    expect(planNextOccurrence(every3, toA, { dueDate: "2026-11-25", rotationIndex: null }, TODAY)?.dueDate).toBe(
      "2026-11-25",
    );
  });

  it("45-day restock style interval", () => {
    expect(
      planNextOccurrence(afterDone("FREQ=DAILY;INTERVAL=45"), toA, { dueDate: "2026-11-01", rotationIndex: null }, TODAY)
        ?.dueDate,
    ).toBe("2027-01-06");
  });
});

describe("planNextOccurrence: rotation", () => {
  const daily = fixed("FREQ=DAILY");

  it("advances from the planned assignee and wraps", () => {
    expect(planNextOccurrence(daily, rotateABC, { dueDate: TODAY, rotationIndex: 0 }, TODAY)).toMatchObject({
      assigneeId: "B",
      rotationIndex: 1,
    });
    expect(planNextOccurrence(daily, rotateABC, { dueDate: TODAY, rotationIndex: 2 }, TODAY)).toMatchObject({
      assigneeId: "A",
      rotationIndex: 0,
    });
  });

  it("skips archived members", () => {
    const bGone: ChoreAssignment = {
      ...rotateABC,
      rotation: [
        { profileId: "A", active: true },
        { profileId: "B", active: false },
        { profileId: "C", active: true },
      ],
    };
    expect(planNextOccurrence(daily, bGone, { dueDate: TODAY, rotationIndex: 0 }, TODAY)?.assigneeId).toBe("C");
  });

  it("falls back to 'anyone' if nobody in the rotation is active", () => {
    const allGone: ChoreAssignment = { ...rotateABC, rotation: [{ profileId: "A", active: false }] };
    expect(planNextOccurrence(daily, allGone, { dueDate: TODAY, rotationIndex: 0 }, TODAY)).toMatchObject({
      assigneeId: null,
      rotationIndex: null,
    });
  });
});

describe("planAfterChoreEdit", () => {
  const pending = { dueDate: "2026-11-19", assigneeId: "B", rotationIndex: 1 };
  const base = { pending, lastClosedOn: null, today: TODAY };

  it("a title-only edit keeps the open task exactly as is (even overdue)", () => {
    expect(
      planAfterChoreEdit({
        ...base,
        schedule: fixed("FREQ=DAILY"),
        assignment: rotateABC,
        scheduleChanged: false,
        assignmentChanged: false,
      }),
    ).toEqual(pending);
  });

  it("a schedule change recalculates the due date from today", () => {
    expect(
      planAfterChoreEdit({
        ...base,
        schedule: fixed("FREQ=WEEKLY;BYDAY=FR"),
        assignment: rotateABC,
        scheduleChanged: true,
        assignmentChanged: false,
      }),
    ).toEqual({ dueDate: "2026-11-27", assigneeId: "B", rotationIndex: 1 });
  });

  it("'after last done' schedules count from the last completion", () => {
    expect(
      planAfterChoreEdit({
        ...base,
        lastClosedOn: "2026-11-20",
        schedule: afterDone("FREQ=DAILY;INTERVAL=7"),
        assignment: rotateABC,
        scheduleChanged: true,
        assignmentChanged: false,
      })?.dueDate,
    ).toBe("2026-11-27");
  });

  it("an assignment change re-picks who, keeping the rotation position if possible", () => {
    expect(
      planAfterChoreEdit({ ...base, schedule: fixed("FREQ=DAILY"), assignment: toA, scheduleChanged: false, assignmentChanged: true }),
    ).toEqual({ dueDate: "2026-11-19", assigneeId: "A", rotationIndex: null });
    expect(
      planAfterChoreEdit({
        ...base,
        schedule: fixed("FREQ=DAILY"),
        assignment: rotateABC,
        scheduleChanged: false,
        assignmentChanged: true,
      }),
    ).toEqual(pending);
  });

  it("a finished chore only comes back when its schedule changes", () => {
    const finished = { ...base, pending: null, schedule: fixed("FREQ=DAILY"), assignment: toA, assignmentChanged: false };
    expect(planAfterChoreEdit({ ...finished, scheduleChanged: false })).toBeNull();
    expect(planAfterChoreEdit({ ...finished, scheduleChanged: true })?.dueDate).toBe(TODAY);
  });

  it("ending the series removes the open task", () => {
    expect(
      planAfterChoreEdit({
        ...base,
        schedule: fixed("FREQ=DAILY;UNTIL=20261121T000000Z"),
        assignment: toA,
        scheduleChanged: true,
        assignmentChanged: false,
      }),
    ).toBeNull();
  });
});

describe("checkUndo", () => {
  const done = { id: "o1", status: "done" as const };

  it("allows undoing the latest close and deletes the task it created", () => {
    expect(checkUndo({ target: done, latestClosedId: "o1", pending: { id: "o2", previousOccurrenceId: "o1" } })).toEqual({
      ok: true,
      deletePendingId: "o2",
    });
  });

  it("allows undo when the chore had no next occurrence (one-time)", () => {
    expect(checkUndo({ target: done, latestClosedId: "o1", pending: null })).toEqual({ ok: true, deletePendingId: null });
  });

  it("refuses older closes, open tasks, and tasks replaced by a schedule change", () => {
    expect(checkUndo({ target: done, latestClosedId: "o9", pending: null }).ok).toBe(false);
    expect(checkUndo({ target: { id: "o1", status: "pending" }, latestClosedId: "o1", pending: null }).ok).toBe(false);
    expect(
      checkUndo({ target: done, latestClosedId: "o1", pending: { id: "o3", previousOccurrenceId: null } }).ok,
    ).toBe(false);
  });
});

describe("previewDueDates", () => {
  it("lists upcoming dates for fixed schedules, only the first for 'after last done'", () => {
    expect(previewDueDates(fixed("FREQ=WEEKLY;BYDAY=TU"), TODAY, 3)).toEqual(["2026-11-24", "2026-12-01", "2026-12-08"]);
    expect(previewDueDates(afterDone("FREQ=DAILY;INTERVAL=3", "2026-11-23"), TODAY)).toEqual(["2026-11-23"]);
    expect(previewDueDates(fixed(null, "2026-12-25"), TODAY)).toEqual(["2026-12-25"]);
  });
});
