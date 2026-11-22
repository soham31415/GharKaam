/**
 * Presentation helpers for the Inventory list. Pure, no React.
 */

import type { ItemGroup } from "@/lib/types";

export type InventoryFilter = "all" | "list" | "low" | "stock";

export function parseInventoryFilter(value: unknown): InventoryFilter {
  return value === "list" || value === "low" || value === "stock" ? value : "all";
}

/** Filter chips plus a name search (case-insensitive, anywhere in the name). Empty groups are dropped. */
export function filterInventory(groups: ItemGroup[], filter: InventoryFilter, query: string): ItemGroup[] {
  const q = query.trim().toLocaleLowerCase("en-IN");
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (q && !i.name.toLocaleLowerCase("en-IN").includes(q)) return false;
        if (filter === "list") return i.onShoppingList;
        if (filter === "low") return i.isLow;
        if (filter === "stock") return !i.onShoppingList;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);
}
