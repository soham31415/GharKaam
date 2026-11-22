import { describe, expect, it } from "vitest";
import type { ChoreSummary, OccurrenceView, PersonRef } from "@/lib/types";
import { choreBadge, dateTile, groupChores, whoText } from "./chores";

const TODAY = "2026-11-22"; // a Sunday
const dad: PersonRef = { id: "d", name: "Dad", avatar: null };
const priya: PersonRef = { id: "p", name: "Priya", avatar: null };

function occ(dueDate: string, patch: Partial<OccurrenceView> = {}): OccurrenceView {
  return {
    id: `o-${dueDate}`,
    choreId: "c",
    choreTitle: "Chore",
    choreNotes: null,
    dueDate,
    dueLabel: dueDate < TODAY ? "2 days overdue" : "Today",
    isOverdue: dueDate < TODAY,
    assignee: null,
    status: "pending",
    closedByName: null,
    closedLabel: null,
    canUndo: false,
    ...patch,
  };
}

function chore(patch: Partial<ChoreSummary>): ChoreSummary {
  return {
    id: Math.random().toString(36),
    title: "Chore",
    notes: null,
    scheduleText: "Every day",
    scheduleMode: "fixed",
    assignmentMode: "anyone",
    assignmentText: "Anyone",
    people: [],
    archived: false,
    next: null,
    ...patch,
  };
}

describe("groupChores", () => {
  it("splits into overdue, this week (next 6 days), later and no date", () => {
    const groups = groupChores(
      [
        chore({ title: "late", next: occ("2026-11-20") }),
        chore({ title: "today", next: occ(TODAY) }),
        chore({ title: "sat", next: occ("2026-11-28") }),
        chore({ title: "mon", next: occ("2026-11-30") }),
        chore({ title: "done" }),
      ],
      TODAY,
    );
    expect(groups.map((g) => [g.key, g.chores.map((c) => c.title)])).toEqual([
      ["overdue", ["late"]],
      ["week", ["today", "sat"]],
      ["later", ["mon"]],
      ["finished", ["done"]],
    ]);
  });

  it("keeps archived chores together and drops empty groups", () => {
    const groups = groupChores([chore({ archived: true })], TODAY);
    expect(groups.map((g) => g.key)).toEqual(["archived"]);
  });
});

describe("dateTile", () => {
  it("shows weekday and day, TODAY for today, and colours by urgency", () => {
    expect(dateTile("2026-11-19", TODAY)).toEqual({ top: "THU", day: "19", tone: "danger" });
    expect(dateTile(TODAY, TODAY)).toEqual({ top: "TODAY", day: "22", tone: "soon" });
    expect(dateTile("2026-12-12", TODAY)).toEqual({ top: "SAT", day: "12", tone: "neutral" });
    expect(dateTile("2027-03-15", TODAY)).toEqual({ top: "MAR", day: "15", tone: "neutral" });
    expect(dateTile(null, TODAY).day).toBe("—");
  });
});

describe("choreBadge", () => {
  it("names the overdue state, finished and archived chores", () => {
    expect(choreBadge(chore({ next: occ("2026-11-21", { dueLabel: "Yesterday (overdue)" }) }))).toEqual({
      text: "Yesterday",
      tone: "danger",
    });
    expect(choreBadge(chore({ next: occ(TODAY) }))).toBeNull();
    expect(choreBadge(chore({}))?.text).toBe("Finished");
    expect(choreBadge(chore({ archived: true }))?.text).toBe("Archived");
  });
});

describe("whoText", () => {
  it("describes one person, turns and anyone", () => {
    expect(whoText(chore({ assignmentMode: "fixed", people: [dad], next: occ(TODAY, { assignee: dad }) }))).toBe("Dad");
    expect(whoText(chore({ assignmentMode: "fixed", people: [dad], next: occ(TODAY, { assignee: priya }) }))).toBe(
      "Dad · this time: Priya",
    );
    expect(whoText(chore({ assignmentMode: "rotation", people: [dad, priya], next: occ(TODAY, { assignee: priya }) }))).toBe(
      "Takes turns · next: Priya",
    );
    expect(whoText(chore({ assignmentMode: "anyone", next: occ(TODAY) }))).toBe("Anyone");
  });
});
