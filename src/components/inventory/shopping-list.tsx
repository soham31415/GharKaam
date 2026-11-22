"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { markBoughtAction, quickAddAction } from "@/actions/inventory";
import { FormMessage } from "@/components/form-message";
import { NotNeededButton } from "@/components/inventory/item-actions";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { useToastAction } from "@/components/use-toast-action";
import type { ItemGroup } from "@/lib/types";

/** Type a name: an existing item is marked running low, anything else is added as a one-off. */
export function QuickAddForm({ categories }: { categories: { id: string; name: string }[] }) {
  // React resets this (uncontrolled) form after each submit, ready for the next item.
  const [state, action] = useActionState(quickAddAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Add to the list
          <Input name="name" required maxLength={60} placeholder="e.g. Batteries" autoComplete="off" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <NativeSelect name="categoryId" defaultValue="">
            <NativeSelectOption value="">Uncategorised</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

/** Tick what you bought, then mark them all at once. */
export function ShoppingList({ groups }: { groups: ItemGroup[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, run] = useToastAction(markBoughtAction);
  const allIds = groups.flatMap((g) => g.items.map((i) => i.id));
  // Items can leave the list while you look at it (someone else bought them).
  const ticked = allIds.filter((id) => selected.has(id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <section key={g.categoryId ?? "none"} className="flex flex-col gap-1">
          <h2 className="font-medium">{g.categoryName}</h2>
          <ul className="flex flex-col">
            {g.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 border-b py-2">
                <label className="flex flex-1 items-start gap-2">
                  <input type="checkbox" className="mt-1" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
                  <span className="flex flex-col">
                    <span>
                      {item.name}
                      {item.quantityText ? <span className="text-muted-foreground"> · {item.quantityText}</span> : null}
                    </span>
                    <span className={item.isOverdue ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                      {item.shoppingReason}
                      {item.isOneOff ? " · one-off" : ""}
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-1">
                  <Link href={`/inventory/${item.id}`} className="text-sm text-muted-foreground underline-offset-4 hover:underline">
                    Details
                  </Link>
                  <NotNeededButton itemId={item.id} name={item.name} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || ticked.length === 0}
          onClick={() => run({ ids: ticked, fromList: "true" }, { onOk: () => setSelected(new Set()) })}
        >
          {pending ? "Saving…" : ticked.length === 0 ? "Tick what you bought" : `Mark ${ticked.length} bought`}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => setSelected(ticked.length === allIds.length ? new Set() : new Set(allIds))}
        >
          {ticked.length === allIds.length ? "Untick all" : "Tick all"}
        </Button>
      </div>
    </div>
  );
}
