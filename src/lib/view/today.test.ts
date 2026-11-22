import { describe, expect, it } from "vitest";
import type { ItemSummary } from "@/lib/types";
import { duePillLabel, longDateLabel, shoppingSummary, todaySummary } from "./today";

const item = (name: string, patch: Partial<ItemSummary> = {}) => ({ name, isOverdue: false, isLow: false, ...patch }) as ItemSummary;
const list = (...items: ItemSummary[]) => ({
  count: items.length,
  groups: [{ categoryId: null, categoryName: "Groceries", items }],
});

describe("Today labels", () => {
  it("formats the date line", () => {
    expect(longDateLabel("2026-11-22")).toBe("Sunday, 22 Nov");
  });

  it("summarises what's left", () => {
    expect(todaySummary([])).toBe("Nothing left for today");
    expect(todaySummary([{ isOverdue: false }])).toBe("1 to do");
    expect(todaySummary([{ isOverdue: true }, { isOverdue: false }, { isOverdue: true }])).toBe("3 to do · 2 overdue");
  });

  it("shortens the overdue suffix for pills", () => {
    expect(duePillLabel("Yesterday (overdue)")).toBe("Yesterday · overdue");
    expect(duePillLabel("Today")).toBe("Today");
  });
});

describe("shoppingSummary", () => {
  it("leads with overdue items, then running-low ones", () => {
    expect(shoppingSummary(list(item("Milk"), item("Eggs", { isOverdue: true })))).toBe("2 items · Eggs overdue");
    expect(shoppingSummary(list(item("Eggs", { isOverdue: true }), item("Atta", { isOverdue: true })))).toBe(
      "2 items · Eggs +1 overdue",
    );
    expect(shoppingSummary(list(item("Shampoo", { isLow: true })))).toBe("1 item · Shampoo running low");
    expect(shoppingSummary(list(item("Milk")))).toBe("1 item");
  });
});
