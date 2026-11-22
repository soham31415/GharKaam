"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { createChoreAction, updateChoreAction } from "@/actions/chores";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  CHORE_REPEAT_OPTIONS,
  initialRecurrence,
  RecurrenceFields,
  type RecurrenceState,
} from "@/components/recurrence/recurrence-fields";
import { formatDate, type DateStr } from "@/lib/domain/dates";
import { previewDueDates } from "@/lib/domain/occurrences";
import { describeSpec, specToRRule } from "@/lib/domain/recurrence";
import type { ChoreFormValues, PersonRef } from "@/lib/types";
import { choreInputSchema } from "@/lib/validation/chores";

type State = RecurrenceState & {
  title: string;
  notes: string;
  startDate: string;
  until: string;
  scheduleMode: "fixed" | "after_completion";
  assignmentMode: "fixed" | "rotation" | "anyone";
  assigneeId: string;
  rotationIds: string[];
  rotationStartId: string;
};

function initialState(values: ChoreFormValues | undefined, today: DateStr, me: string): State {
  const start = values?.startDate ?? today;
  const spec = values?.spec;
  return {
    ...initialRecurrence(spec, start, "weekly"),
    title: values?.title ?? "",
    notes: values?.notes ?? "",
    startDate: start,
    until: spec && "until" in spec ? (spec.until ?? "") : "",
    scheduleMode: values?.scheduleMode ?? "fixed",
    assignmentMode: values?.assignmentMode ?? "fixed",
    assigneeId: values?.assigneeId ?? me,
    rotationIds: values?.rotationIds ?? [],
    rotationStartId: "",
  };
}

/** Runs the same validation the server uses, to drive the live preview. */
function usePreview(s: State, today: DateStr) {
  return useMemo(() => {
    const parsed = choreInputSchema.safeParse({ ...s, title: s.title || "preview", assignmentMode: "anyone" });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the schedule", text: "", dates: [] };
    const { spec, startDate, scheduleMode } = parsed.data;
    try {
      const dates = previewDueDates({ rrule: specToRRule(spec), startDate, scheduleMode }, today, 5);
      return { error: null, text: describeSpec(spec), dates };
    } catch {
      return { error: "That rule can't be previewed.", text: "", dates: [] };
    }
  }, [s, today]);
}

export function ChoreForm({
  choreId,
  values,
  people,
  today,
  meId,
}: {
  /** Present when editing. */
  choreId?: string;
  values?: ChoreFormValues;
  people: PersonRef[];
  today: DateStr;
  meId: string;
}) {
  const [state, action, pending] = useActionState(choreId ? updateChoreAction : createChoreAction, null);
  // Submit via onSubmit rather than <form action>: React resets a form after an
  // action, which snaps controlled <select>s back to their first option on screen.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };
  const [s, setS] = useState<State>(() => initialState(values, today, meId));
  const set = <K extends keyof State>(key: K, value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const preview = usePreview(s, today);
  const fieldError = (name: string) =>
    state && !state.ok && state.fieldErrors?.[name] ? (
      <span className="text-sm text-destructive">{state.fieldErrors[name][0]}</span>
    ) : null;

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {choreId ? <input type="hidden" name="id" value={choreId} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Chore</Label>
        <Input id="title" name="title" value={s.title} onChange={(e) => set("title", e.target.value)} required maxLength={80} />
        {fieldError("title")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" value={s.notes} onChange={(e) => set("notes", e.target.value)} maxLength={500} />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">When</legend>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">{s.repeat === "once" ? "Due date" : "Starting from"}</Label>
          <Input id="startDate" type="date" name="startDate" value={s.startDate} onChange={(e) => set("startDate", e.target.value)} required className="w-auto" />
          {fieldError("startDate")}
        </div>

        <RecurrenceFields
          value={s}
          onChange={(patch) => setS((prev) => ({ ...prev, ...patch }))}
          options={CHORE_REPEAT_OPTIONS}
          fieldError={fieldError}
        />

        {s.repeat !== "once" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="until">Ends on (optional)</Label>
              <Input id="until" type="date" name="until" value={s.until} onChange={(e) => set("until", e.target.value)} className="w-auto" />
              {fieldError("until")}
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
              <span>Next date is counted</span>
              <label className="flex items-center gap-2">
                <input type="radio" name="scheduleMode" value="fixed" checked={s.scheduleMode === "fixed"} onChange={() => set("scheduleMode", "fixed")} />
                On the calendar (e.g. bins every Tuesday, even if done late)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="scheduleMode" value="after_completion" checked={s.scheduleMode === "after_completion"} onChange={() => set("scheduleMode", "after_completion")} />
                From when it was last done (e.g. 3 days after watering)
              </label>
            </div>
          </>
        ) : null}

        <div className="rounded-md bg-muted p-2 text-sm">
          {preview.error ? (
            <span className="text-muted-foreground">Preview: {preview.error}</span>
          ) : (
            <>
              <div>{preview.text}</div>
              <div className="text-muted-foreground">
                {preview.dates.length === 0
                  ? "No upcoming dates. Check the start and end dates."
                  : `Next: ${preview.dates.map((d) => formatDate(d, today)).join(", ")}`}
                {s.repeat !== "once" && s.scheduleMode === "after_completion" && preview.dates.length > 0
                  ? ", then depends on when it's done"
                  : ""}
              </div>
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
        <legend className="px-1 text-sm font-medium">Who</legend>
        <div className="flex flex-col gap-1.5 text-sm">
          {(
            [
              ["fixed", "One person"],
              ["rotation", "Take turns"],
              ["anyone", "Anyone"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2">
              <input type="radio" name="assignmentMode" value={value} checked={s.assignmentMode === value} onChange={() => set("assignmentMode", value)} />
              {label}
            </label>
          ))}
        </div>

        {s.assignmentMode === "fixed" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assigneeId">Person</Label>
            <NativeSelect id="assigneeId" name="assigneeId" value={s.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
              <NativeSelectOption value="">Choose…</NativeSelectOption>
              {people.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("assigneeId")}
          </div>
        ) : null}

        {s.assignmentMode === "rotation" ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm">Turns go in this order (tick who takes part):</span>
            {people.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.rotationIds.includes(p.id)} onChange={() => set("rotationIds", toggle(s.rotationIds, p.id))} />
                {p.name}
              </label>
            ))}
            {/* Submit in family order, regardless of tick order. */}
            {people
              .filter((p) => s.rotationIds.includes(p.id))
              .map((p) => (
                <input key={p.id} type="hidden" name="rotationIds" value={p.id} />
              ))}
            {fieldError("rotationIds")}
            {!choreId && s.rotationIds.length > 1 ? (
              <label className="flex flex-col gap-1 text-sm">
                First turn
                <NativeSelect name="rotationStartId" value={s.rotationStartId} onChange={(e) => set("rotationStartId", e.target.value)}>
                  <NativeSelectOption value="">First in the list</NativeSelectOption>
                  {people
                    .filter((p) => s.rotationIds.includes(p.id))
                    .map((p) => (
                      <NativeSelectOption key={p.id} value={p.id}>
                        {p.name}
                      </NativeSelectOption>
                    ))}
                </NativeSelect>
              </label>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <FormMessage state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : choreId ? "Save changes" : "Create chore"}
      </Button>
    </form>
  );
}
