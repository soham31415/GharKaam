import { describe, expect, it } from "vitest";
import type { ItemGroup, ItemSummary } from "@/lib/types";
import { filterInventory, parseInventoryFilter } from "./inventory";

const item = (name: string, patch: Partial<ItemSummary> = {}) =>
  ({ id: name, name, isLow: false, onShoppingList: false, ...patch }) as ItemSummary;

const groups: ItemGroup[] = [
  { categoryId: "g", categoryName: "Groceries", items: [item("Atta", { onShoppingList: true }), item("Rice")] },
  { categoryId: "t", categoryName: "Toiletries", items: [item("Shampoo", { isLow: true, onShoppingList: true })] },
];

const names = (gs: ItemGroup[]) => gs.flatMap((g) => g.items.map((i) => i.name));

describe("filterInventory", () => {
  it("filters by chip", () => {
    expect(names(filterInventory(groups, "all", ""))).toEqual(["Atta", "Rice", "Shampoo"]);
    expect(names(filterInventory(groups, "list", ""))).toEqual(["Atta", "Shampoo"]);
    expect(names(filterInventory(groups, "low", ""))).toEqual(["Shampoo"]);
    expect(names(filterInventory(groups, "stock", ""))).toEqual(["Rice"]);
  });

  it("searches names and drops empty groups", () => {
    const result = filterInventory(groups, "all", "  RI ");
    expect(names(result)).toEqual(["Rice"]);
    expect(result.map((g) => g.categoryName)).toEqual(["Groceries"]);
  });

  it("parses the URL filter", () => {
    expect(parseInventoryFilter("low")).toBe("low");
    expect(parseInventoryFilter(undefined)).toBe("all");
    expect(parseInventoryFilter("archived")).toBe("all");
  });
});
