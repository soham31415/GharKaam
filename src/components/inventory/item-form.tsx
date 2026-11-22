"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { createItemAction, updateItemAction } from "@/actions/inventory";
import type { ActionState } from "@/actions/result";
import { FormMessage } from "@/components/form-message";
import {
  initialRecurrence,
  RecurrenceFields,
  RESTOCK_REPEAT_OPTIONS,
  type RecurrenceState,
} from "@/components/recurrence/recurrence-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, type DateStr } from "@/lib/domain/dates";
import { describeSpec, specToRRule } from "@/lib/domain/recurrence";
import { nextRestockDue } from "@/lib/domain/restock";
import type { ItemFormValues } from "@/lib/types";
import { itemInputSchema } from "@/lib/validation/inventory";

type State = RecurrenceState & {
  name: string;
  categoryId: string;
  unit: string;
  usualQuantity: string;
  notes: string;
  lastRestockedOn: string;
};

const UNITS = ["kg", "g", "L", "ml", "packet", "piece", "dozen", "bottle", "box", "can", "bar", "tube"];

function initialState(values: ItemFormValues | undefined, today: DateStr): State {
  const recurrence = initialRecurrence(values?.spec, values?.lastRestockedOn ?? today, "daily");
  if (!values) recurrence.interval = "7"; // new items default to "every 7 days"
  return {
    ...recurrence,
    name: values?.name ?? "",
    categoryId: values?.categoryId ?? "",
    unit: values?.unit ?? "",
    usualQuantity: values?.usualQuantity ?? "",
    notes: values?.notes ?? "",
    // New items: assume you have some now, so the schedule counts from today.
    lastRestockedOn: values ? (values.lastRestockedOn ?? "") : today,
  };
}

function usePreview(s: State, today: DateStr) {
  return useMemo(() => {
    const parsed = itemInputSchema.safeParse({ ...s, name: s.name || "preview", usualQuantity: "", unit: "" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the schedule", text: "" };
    const { spec, lastRestockedOn } = parsed.data;
    if (spec.kind === "once") return { error: null, text: "Goes on the shopping list only when someone marks it running low." };
    try {
      const due = nextRestockDue(specToRRule(spec), lastRestockedOn, today);
      const when = !due ? "no upcoming date" : due <= today ? "due now (goes on the shopping list)" : `next due ${formatDate(due, today)}`;
      return { error: null, text: `${describeSpec(spec)}, counted from the last purchase: ${when}.` };
    } catch {
      return { error: "That rule can't be previewed.", text: "" };
    }
  }, [s, today]);
}

export function ItemForm({
  itemId,
  values,
  categories,
  today,
}: {
  /** Present when editing. */
  itemId?: string;
  values?: ItemFormValues;
  categories: { id: string; name: string }[];
  today: DateStr;
}) {
  const [s, setS] = useState<State>(() => initialState(values, today));
  const [result, setResult] = useState<ActionState<unknown>>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof State>(key: K, value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const preview = usePreview(s, today);
  const fieldError = (name: string) =>
    result && !result.ok && result.fieldErrors?.[name] ? (
      <span className="text-sm text-destructive">{result.fieldErrors[name][0]}</span>
    ) : null;

  // Submit via onSubmit rather than <form action>: React resets a form after an
  // action, which snaps controlled <select>s back to their first option on screen.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    start(async () => {
      const res = itemId ? await updateItemAction(null, formData) : await createItemAction(null, formData);
      setResult(res);
      if (!res?.ok) return;
      toast.success(res.message ?? "Saved.");
      if (!itemId) {
        // Ready for the next item; keep the category and schedule, which are often the same.
        setS((prev) => ({ ...prev, name: "", unit: "", usualQuantity: "", notes: "" }));
        setResult(null);
      }
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {itemId ? <input type="hidden" name="id" value={itemId} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Item</Label>
        <Input id="name" name="name" value={s.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
        {fieldError("name")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoryId">Category</Label>
        <NativeSelect id="categoryId" name="categoryId" value={s.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
          <NativeSelectOption value="">Uncategorised</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.id}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {fieldError("categoryId")}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="usualQuantity">Usual quantity (optional)</Label>
          <Input id="usualQuantity" name="usualQuantity" inputMode="decimal" value={s.usualQuantity} onChange={(e) => set("usualQuantity", e.target.value)} className="w-28" placeholder="2" />
          {fieldError("usualQuantity")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unit">Unit (optional)</Label>
          <Input id="unit" name="unit" list="units" value={s.unit} onChange={(e) => set("unit", e.target.value)} className="w-28" placeholder="kg" maxLength={20} />
          <datalist id="units">
            {UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          {fieldError("unit")}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" value={s.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} placeholder="Brand, size, which shop…" />
        {fieldError("notes")}
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Restocking</legend>
        <RecurrenceFields
          value={s}
          onChange={(patch) => setS((prev) => ({ ...prev, ...patch }))}
          options={RESTOCK_REPEAT_OPTIONS}
          label="Buy again"
          fieldError={fieldError}
        />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastRestockedOn">Last bought (optional)</Label>
          <Input id="lastRestockedOn" type="date" name="lastRestockedOn" value={s.lastRestockedOn} max={today} onChange={(e) => set("lastRestockedOn", e.target.value)} className="w-auto" />
          <span className="text-xs text-muted-foreground">Leave empty if you&apos;ve run out: it goes on the shopping list now.</span>
          {fieldError("lastRestockedOn")}
        </div>
        <div className="rounded-md bg-muted p-2 text-sm">
          {preview.error ? <span className="text-muted-foreground">Preview: {preview.error}</span> : preview.text}
        </div>
      </fieldset>

      <FormMessage state={result && !result.ok ? result : null} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : itemId ? "Save changes" : "Add item"}
      </Button>
    </form>
  );
}
