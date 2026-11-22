import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  isOnShoppingList,
  lastBoughtLabel,
  nextDueAfterItemEdit,
  nextRestockDue,
  postponeRestock,
  restockDueLabel,
  shoppingReason,
} from "./restock";

// 2026-11-22 is a Sunday.
const SUN = "2026-11-22";

describe("nextRestockDue", () => {
  it("counts every N days from the last restock", () => {
    expect(nextRestockDue("FREQ=DAILY;INTERVAL=10", "2026-11-01", SUN)).toBe("2026-11-11");
  });

  it("can be overdue (the list shows it until bought)", () => {
    expect(nextRestockDue("FREQ=DAILY;INTERVAL=3", "2026-11-01", SUN)).toBe("2026-11-04");
  });

  it("weekly on a market day: the next such day after the purchase", () => {
    expect(nextRestockDue("FREQ=WEEKLY;INTERVAL=1;BYDAY=SU", "2026-11-18", SUN)).toBe(SUN); // bought Wed
    expect(nextRestockDue("FREQ=WEEKLY;INTERVAL=1;BYDAY=SU", SUN, SUN)).toBe("2026-11-29"); // bought on the day
  });

  it("monthly on the 31st clamps to shorter months", () => {
    expect(nextRestockDue("FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=28,29,30,31;BYSETPOS=-1", "2026-11-05", SUN)).toBe(
      "2026-11-30",
    );
  });

  it("no schedule → never due by date; never bought → due now", () => {
    expect(nextRestockDue(null, "2026-11-01", SUN)).toBeNull();
    expect(nextRestockDue("FREQ=DAILY;INTERVAL=7", null, SUN)).toBe(SUN);
  });

  it("a schedule that has ended has no next date", () => {
    expect(nextRestockDue("FREQ=DAILY;INTERVAL=7;UNTIL=20261105", "2026-11-01", SUN)).toBeNull();
  });
});

describe("nextDueAfterItemEdit", () => {
  const base = { rrule: "FREQ=DAILY;INTERVAL=10", lastRestockedOn: "2026-11-20", currentNextDue: "2026-11-23", today: SUN };
  it("keeps the current due date when only the name/notes changed", () => {
    expect(nextDueAfterItemEdit({ ...base, scheduleChanged: false })).toBe("2026-11-23");
  });
  it("recalculates when the schedule or last-bought date changed", () => {
    expect(nextDueAfterItemEdit({ ...base, scheduleChanged: true })).toBe("2026-11-30");
  });
  it("removing the schedule clears the due date", () => {
    expect(nextDueAfterItemEdit({ ...base, rrule: null, scheduleChanged: true })).toBeNull();
  });
});

describe("postponeRestock", () => {
  it("counts the schedule from today", () => {
    expect(postponeRestock("FREQ=DAILY;INTERVAL=5", SUN)).toBe("2026-11-27");
    expect(postponeRestock(null, SUN)).toBeNull();
  });
});

describe("isOnShoppingList", () => {
  const item = (nextDueOn: string | null, restockCountedFrom: string | null = "2026-11-01", isLow = false) => ({
    isLow,
    nextDueOn,
    restockCountedFrom,
  });

  it("includes low items and items due today or overdue", () => {
    expect(isOnShoppingList(item(null, null, true), SUN, 2)).toBe(true);
    expect(isOnShoppingList(item("2026-11-01"), SUN, 2)).toBe(true);
    expect(isOnShoppingList(item(SUN, "2026-11-21"), SUN, 2)).toBe(true);
    expect(isOnShoppingList(item(null), SUN, 2)).toBe(false);
  });

  it("includes items due within the lookahead if the cycle started long enough ago", () => {
    expect(isOnShoppingList(item("2026-11-24"), SUN, 2)).toBe(true); // boundary
    expect(isOnShoppingList(item("2026-11-25"), SUN, 2)).toBe(false);
    expect(isOnShoppingList(item("2026-11-24", null), SUN, 2)).toBe(true);
  });

  it("does not show recently bought fast-cycle items early (daily milk would never leave the list)", () => {
    expect(isOnShoppingList(item("2026-11-23", SUN), SUN, 2)).toBe(false); // bought today, due tomorrow
    expect(isOnShoppingList(item("2026-11-24", "2026-11-20"), SUN, 2)).toBe(false); // started 2 days ago
    expect(isOnShoppingList(item("2026-11-24", "2026-11-19"), SUN, 2)).toBe(true); // started 3 days ago
  });
});

describe("labels", () => {
  it("restockDueLabel", () => {
    expect(restockDueLabel(SUN, SUN)).toBe("Due today");
    expect(restockDueLabel("2026-11-23", SUN)).toBe("Due tomorrow");
    expect(restockDueLabel("2026-11-25", SUN)).toBe("Due in 3 days");
    expect(restockDueLabel("2026-11-21", SUN)).toBe("1 day overdue");
    expect(restockDueLabel("2026-11-19", SUN)).toBe("3 days overdue");
    expect(restockDueLabel("2026-12-03", SUN)).toBe("Due Thu 3 Dec");
  });

  it("shoppingReason combines low and due", () => {
    const base = { restockCountedFrom: "2026-11-01" };
    expect(shoppingReason({ ...base, isLow: true, nextDueOn: "2026-11-23", lowFlaggedByName: "Rohan" }, SUN, 2)).toBe(
      "Running low (Rohan) · Due tomorrow",
    );
    expect(shoppingReason({ ...base, isLow: true, nextDueOn: "2026-12-30", lowFlaggedByName: null }, SUN, 2)).toBe(
      "Running low",
    );
  });

  it("lastBoughtLabel", () => {
    expect(lastBoughtLabel(SUN, SUN)).toBe("Last bought today");
    expect(lastBoughtLabel("2026-11-21", SUN)).toBe("Last bought yesterday");
    expect(lastBoughtLabel("2026-11-19", SUN)).toBe("Last bought 3 days ago");
    expect(lastBoughtLabel("2026-11-01", SUN)).toBe("Last bought Sun 1 Nov");
  });

  it("formatQuantity trims Postgres decimals", () => {
    expect(formatQuantity("2.00", "kg")).toBe("2 kg");
    expect(formatQuantity("1.50", "L")).toBe("1.5 L");
    expect(formatQuantity("6.00", null)).toBe("6");
    expect(formatQuantity(null, "kg")).toBeNull();
  });
});
