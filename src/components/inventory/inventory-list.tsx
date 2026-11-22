"use client";

import { cn } from "cn";
import { ArrowDown, Search, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { startTransition, useState } from "react";
import { toast } from "sonner";
import { setLowAction } from "@/actions/inventory";
import { HappyHouse } from "@/components/illustrations";
import { EmptyState, GroupCard, Pill, Section } from "@/components/shell/grouped";
import { callAction } from "@/components/use-toast-action";
import type { ItemGroup, ItemSummary } from "@/lib/types";
import { filterInventory, type InventoryFilter } from "@/lib/view/inventory";

const CHIPS: { value: InventoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "list", label: "On the list" },
  { value: "low", label: "Running low" },
  { value: "stock", label: "In stock" },
];

const chipClass = (on: boolean) =>
  cn(
    "pressable flex h-[34px] shrink-0 items-center rounded-full px-3.5 text-sm font-semibold whitespace-nowrap",
    on ? "bg-foreground text-background" : "bg-card text-[#3A3A3C] dark:text-[#D1D1D6]",
  );

/**
 * Inventory with search and filter chips (filtered on the phone, instantly).
 * "Archived" is a separate server view, so that chip is a link.
 */
export function InventoryList({
  groups,
  archived,
  initialFilter,
}: {
  groups: ItemGroup[];
  archived: boolean;
  initialFilter: InventoryFilter;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InventoryFilter>(initialFilter);
  /** Running-low taps shown straight away, until the server's answer arrives. */
  const [lowOverride, setLowOverride] = useState<Record<string, boolean>>({});
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    setLowOverride({});
  }

  const withOverrides = groups.map((g) => ({
    ...g,
    items: g.items.map((i) =>
      i.id in lowOverride && lowOverride[i.id] !== i.isLow
        ? { ...i, isLow: lowOverride[i.id], onShoppingList: lowOverride[i.id] || i.onShoppingList, statusText: lowOverride[i.id] ? "Running low" : i.statusText }
        : i,
    ),
  }));
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const shown = filterInventory(withOverrides, archived ? "all" : filter, query);

  const toggleLow = (item: ItemSummary) => {
    const low = !item.isLow;
    setLowOverride((o) => ({ ...o, [item.id]: low }));
    startTransition(async () => {
      const res = await callAction(setLowAction, { id: item.id, low: String(low) });
      if (res?.ok) {
        if (res.message) toast.success(`${item.name}: ${res.message}`);
      } else {
        setLowOverride((o) => ({ ...o, [item.id]: !low }));
        if (res) toast.error(res.error);
      }
    });
  };

  return (
    <>
      <label className="-mt-2 flex h-10 items-center gap-2 rounded-tile bg-fill px-3 dark:bg-[#1C1C1E]">
        <Search aria-hidden="true" className="size-[17px] shrink-0 text-muted-foreground" strokeWidth={2.4} />
        <span className="sr-only">Search items</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${total} item${total === 1 ? "" : "s"}`}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
      </label>

      <div className="-mx-4 -mt-2 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((c) =>
          archived ? (
            <Link key={c.value} href={c.value === "all" ? "/inventory" : `/inventory?show=${c.value}`} className={chipClass(false)}>
              {c.label}
            </Link>
          ) : (
            <button key={c.value} type="button" aria-pressed={filter === c.value} onClick={() => setFilter(c.value)} className={chipClass(filter === c.value)}>
              {c.label}
            </button>
          ),
        )}
        <Link href={archived ? "/inventory" : "/inventory?show=archived"} aria-current={archived ? "page" : undefined} className={chipClass(archived)}>
          Archived
        </Link>
      </div>

      {shown.length === 0 ? (
        <EmptyState art={<HappyHouse />} title={emptyTitle(total, archived, query)}>
          {emptyText(total, archived, query)}
        </EmptyState>
      ) : (
        shown.map((g) => (
          <Section key={g.categoryId ?? "none"} label={g.categoryName} className="-mt-2 gap-1.5">
            <GroupCard>
              {g.items.map((item) => (
                <ItemRow key={item.id} item={item} onToggleLow={() => toggleLow(item)} />
              ))}
            </GroupCard>
          </Section>
        ))
      )}
    </>
  );
}

function emptyTitle(total: number, archived: boolean, query: string) {
  if (archived) return "No archived items";
  if (total === 0) return "No items yet";
  return query ? "No matches" : "Nothing here";
}

function emptyText(total: number, archived: boolean, query: string) {
  if (archived) return "Items an admin archives will rest here.";
  if (total === 0) return "Add the things you buy regularly.";
  return query ? `Nothing called “${query}”. Add it from the shopping list.` : "No items match this filter.";
}

function ItemRow({ item, onToggleLow }: { item: ItemSummary; onToggleLow: () => void }) {
  const tone = item.archived ? "neutral" : item.isLow || item.isOverdue ? "danger" : item.onShoppingList ? "soon" : "neutral";
  const bought = item.lastBoughtText?.replace(/^Last bought/, "Bought") ?? "Never bought";
  const last = [bought, item.isOneOff ? "one-off" : null].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-2.5 py-2.5 pr-2.5 pl-4">
      <Link href={`/inventory/${item.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[16.5px] font-semibold">
          {item.name}
          {item.quantityText ? <span className="font-normal text-muted-foreground"> · {item.quantityText}</span> : null}
        </span>
        <span className="flex flex-wrap items-center gap-2">
          <Pill tone={tone}>
            {item.onShoppingList && !item.archived ? <ShoppingCart aria-hidden="true" strokeWidth={2.6} /> : null}
            {item.archived ? "Archived" : item.statusText}
          </Pill>
          <span className="text-[12.5px] text-muted-foreground">{last}</span>
        </span>
      </Link>
      {!item.archived ? (
        <button
          type="button"
          onClick={onToggleLow}
          aria-pressed={item.isLow}
          aria-label={item.isLow ? `${item.name}: not low any more` : `Mark ${item.name} running low`}
          className={cn(
            "pressable inline-flex h-9 shrink-0 items-center gap-[5px] rounded-full px-3 text-[13.5px] font-semibold",
            item.isLow ? "bg-primary text-primary-foreground" : "border-[1.5px] border-[#F3C9A8] bg-card text-primary dark:border-primary/40",
          )}
        >
          <ArrowDown aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
          {item.isLow ? "Not low" : "Low"}
        </button>
      ) : null}
    </div>
  );
}
