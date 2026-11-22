"use client";

import { useActionState, useState } from "react";
import {
  archiveItemAction,
  markBoughtAction,
  notNeededAction,
  restoreItemAction,
  setLowAction,
} from "@/actions/inventory";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToastAction } from "@/components/use-toast-action";

/** "Running low" on/off. */
export function LowToggleButton({ itemId, name, isLow }: { itemId: string; name: string; isLow: boolean }) {
  const [pending, run] = useToastAction(setLowAction);
  return (
    <Button
      variant={isLow ? "secondary" : "outline"}
      size="sm"
      disabled={pending}
      onClick={() => run({ id: itemId, low: String(!isLow) }, { prefix: name })}
    >
      {isLow ? "Not low any more" : "Running low"}
    </Button>
  );
}

/** Take an item off the shopping list without buying it. */
export function NotNeededButton({ itemId, name }: { itemId: string; name: string }) {
  const [pending, run] = useToastAction(notNeededAction);
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run({ id: itemId }, { prefix: name })}>
      Not needed
    </Button>
  );
}

/** Mark one item bought, with an optional quantity (defaults to the usual quantity). */
export function BoughtForm({
  itemId,
  name,
  usualQuantity,
  unit,
}: {
  itemId: string;
  name: string;
  usualQuantity: string | null;
  unit: string | null;
}) {
  const [pending, run] = useToastAction(markBoughtAction);
  const [quantity, setQuantity] = useState(usualQuantity ?? "");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-sm">
        How much (optional)
        <span className="flex items-center gap-1">
          <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" className="w-24" />
          {unit ? <span className="text-muted-foreground">{unit}</span> : null}
        </span>
      </label>
      <Button disabled={pending} onClick={() => run({ ids: itemId, quantity }, { prefix: name })}>
        {pending ? "Saving…" : "Bought today"}
      </Button>
    </div>
  );
}

export function ArchiveItemButton({ itemId, archived }: { itemId: string; archived: boolean }) {
  const [state, action] = useActionState(archived ? restoreItemAction : archiveItemAction, null);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={itemId} />
      <SubmitButton variant={archived ? "outline" : "destructive"} pendingText="…">
        {archived ? "Restore item" : "Archive item"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
