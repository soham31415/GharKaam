"use client";

import { cn } from "cn";
import { Check, ChevronDown, Clock, Ellipsis, Plus, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { markBoughtAction, notNeededAction, quickAddAction } from "@/actions/inventory";
import { GroupCard, Section } from "@/components/shell/grouped";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { callAction } from "@/components/use-toast-action";
import type { ItemGroup, ItemSummary } from "@/lib/types";

/**
 * Type a name and press return: an existing item is marked running low,
 * anything else is added as a one-off. The result comes back as a toast and the
 * field stays focused, ready for the next item.
 */
export function QuickAddForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const category = categories.find((c) => c.id === categoryId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || pending) return;
    start(async () => {
      const res = await callAction(quickAddAction, { name, categoryId });
      if (res?.ok) {
        setName("");
        if (res.message) toast.success(res.message);
      } else if (res) {
        toast.error(res.error);
      }
      input.current?.focus();
    });
  };

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-field bg-card px-3 focus-within:ring-3 focus-within:ring-ring/30">
        <Plus aria-hidden="true" className="size-[18px] shrink-0 text-tertiary" strokeWidth={2.4} />
        <span className="sr-only">Add to the list</span>
        <input
          ref={input}
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Add to the list, e.g. Batteries"
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-tertiary"
        />
      </label>
      <span className="relative inline-flex">
        <span className="pointer-events-none flex h-11 max-w-36 items-center gap-1 rounded-field bg-card px-3 text-sm font-semibold text-[#3A3A3C] dark:text-[#D1D1D6]">
          <span className="truncate">{category?.name ?? "Category"}</span>
          <ChevronDown aria-hidden="true" className="size-3 shrink-0" strokeWidth={3} />
        </span>
        <select
          aria-label="Category for a new item"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          <option value="">Uncategorised</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </span>
      {name.trim() ? (
        <button
          type="submit"
          disabled={pending}
          className="pressable h-11 shrink-0 rounded-field bg-primary px-3.5 text-[15px] font-semibold text-primary-foreground animate-in fade-in-0 zoom-in-95 duration-150 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      ) : null}
    </form>
  );
}

/** Tick what goes into the trolley, then mark them all bought at once. */
export function ShoppingList({ groups }: { groups: ItemGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  /** Rows on their way out (bought or not needed); collapsed until the server drops them. */
  const [leaving, setLeaving] = useState<Set<string>>(() => new Set());
  const [buying, setBuying] = useState(false);

  // Fresh server data is the truth: forget rows we were hiding.
  const [prevGroups, setPrevGroups] = useState(groups);
  if (prevGroups !== groups) {
    setPrevGroups(groups);
    if (leaving.size) setLeaving(new Set());
  }

  const items = groups.flatMap((g) => g.items).filter((i) => !leaving.has(i.id));
  // Items can leave the list while you look at it (someone else bought them).
  const ticked = items.filter((i) => selected.has(i.id)).map((i) => i.id);
  const allTicked = items.length > 0 && ticked.length === items.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const hide = (ids: string[], on: boolean) =>
    setLeaving((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const buy = () => {
    if (ticked.length === 0 || buying) return;
    const ids = ticked;
    setBuying(true);
    hide(ids, true);
    startTransition(async () => {
      const res = await callAction(markBoughtAction, { ids, fromList: "true" });
      setBuying(false);
      if (res?.ok) {
        setSelected(new Set());
        if (res.message) toast.success(res.message);
      } else {
        hide(ids, false);
        if (res) toast.error(res.error);
      }
    });
  };

  const notNeeded = (item: ItemSummary) => {
    hide([item.id], true);
    startTransition(async () => {
      const res = await callAction(notNeededAction, { id: item.id });
      if (res?.ok) {
        if (res.message) toast.success(`${item.name}: ${res.message}`);
      } else {
        hide([item.id], false);
        if (res) toast.error(res.error);
      }
    });
  };

  return (
    <>
      {groups.map((g) => (
        <Section key={g.categoryId ?? "none"} label={g.categoryName} className="-mt-1 gap-1.5">
          <GroupCard>
            {g.items.map((item) => {
              const on = selected.has(item.id);
              return (
                <div key={item.id} className="collapsible-row" data-leaving={leaving.has(item.id) ? "" : undefined}>
                  <div>
                    <div className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
                      <button
                        type="button"
                        onClick={() => toggle(item.id)}
                        aria-pressed={on}
                        aria-label={`${on ? "Untick" : "Tick"} ${item.name}`}
                        className="group/tick flex size-[52px] shrink-0 items-center justify-center"
                      >
                        <span
                          className={cn(
                            "flex size-[30px] items-center justify-center rounded-full transition-[background-color,border-color,transform] duration-150 ease-out group-active/tick:scale-90",
                            on ? "border-0 bg-primary" : "border-2 border-chevron",
                          )}
                        >
                          <Check
                            aria-hidden="true"
                            strokeWidth={3.2}
                            className={cn(
                              "size-[17px] text-primary-foreground transition-[opacity,transform] duration-150 ease-out",
                              on ? "scale-100 opacity-100" : "scale-50 opacity-0",
                            )}
                          />
                        </span>
                      </button>
                      <button type="button" onClick={() => toggle(item.id)} tabIndex={-1} className="flex min-w-0 flex-1 flex-col gap-[3px] text-left">
                        <span
                          className={cn(
                            "text-[17px] leading-snug font-semibold transition-colors duration-150",
                            on ? "text-tertiary line-through" : "text-foreground",
                          )}
                        >
                          {item.name}
                          {item.quantityText ? <span className="font-normal text-muted-foreground"> · {item.quantityText}</span> : null}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[13px] font-medium",
                            item.isOverdue ? "text-danger-foreground dark:text-destructive" : on ? "text-tertiary" : "text-muted-foreground",
                          )}
                        >
                          {item.isOverdue ? <Clock aria-hidden="true" className="size-3 shrink-0" strokeWidth={2.8} /> : null}
                          {item.shoppingReason}
                          {item.isOneOff ? " · one-off" : ""}
                        </span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`More for ${item.name}: Details or Not needed`}
                          className="pressable flex size-11 shrink-0 items-center justify-center rounded-full text-tertiary"
                        >
                          <Ellipsis aria-hidden="true" className="size-5" strokeWidth={2.6} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44 rounded-xl p-1.5">
                          <DropdownMenuItem className="rounded-lg px-3 py-2.5 text-[15px]" onClick={() => router.push(`/inventory/${item.id}`)}>
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg px-3 py-2.5 text-[15px]" onClick={() => notNeeded(item)}>
                            Not needed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              );
            })}
          </GroupCard>
        </Section>
      ))}

      {/* Room for the sticky bar. */}
      <div aria-hidden="true" className="h-[52px]" />

      <div className="fixed inset-x-0 bottom-(--tabbar-h) z-30 mx-auto flex w-full max-w-2xl items-center gap-2.5 border-t border-bar-border bg-background/95 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => setSelected(allTicked ? new Set() : new Set(items.map((i) => i.id)))}
          disabled={buying || items.length === 0}
          className="pressable h-[52px] shrink-0 rounded-2xl bg-card px-4 text-[15px] font-semibold text-[#3A3A3C] disabled:opacity-60 dark:text-[#D1D1D6]"
        >
          {allTicked ? "Untick all" : "Tick all"}
        </button>
        <button
          type="button"
          onClick={buy}
          disabled={buying || ticked.length === 0}
          className={cn(
            "pressable inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[17px] font-bold",
            ticked.length > 0 ? "bg-primary text-primary-foreground" : "bg-[#E5E5EA] text-muted-foreground dark:bg-[#2C2C2E]",
          )}
        >
          <ShoppingCart aria-hidden="true" className="size-5" strokeWidth={2.4} />
          {buying ? "Saving…" : ticked.length > 0 ? `Mark ${ticked.length} bought` : "Tick what you bought"}
        </button>
      </div>
    </>
  );
}
