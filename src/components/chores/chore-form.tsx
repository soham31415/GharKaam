"use client";

import { useActionState, useMemo, useState } from "react";
import { createChoreAction, updateChoreAction } from "@/actions/chores";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, toUtcDate, type DateStr } from "@/lib/domain/dates";
import { previewDueDates } from "@/lib/domain/occurrences";
import {
  describeSpec,
  specToRRule,
  WEEKDAY_LABELS,
  WEEKDAYS,
  type RecurrenceSpec,
  type RepeatKind,
  type Weekday,
} from "@/lib/domain/recurrence";
import type { ChoreFormValues, PersonRef } from "@/lib/types";
import { choreInputSchema } from "@/lib/validation/chores";

type State = {
  title: string;
  notes: string;
  startDate: string;
  repeat: RepeatKind;
  interval: string;
  weekdays: Weekday[];
  monthDay: string;
  nth: string;
  nthWeekday: Weekday;
  yearMonth: string;
  yearDay: string;
  customRrule: string;
  until: string;
  scheduleMode: "fixed" | "after_completion";
  assignmentMode: "fixed" | "rotation" | "anyone";
  assigneeId: string;
  rotationIds: string[];
  rotationStartId: string;
};

const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: "once", label: "One time" },
  { value: "daily", label: "Every N days" },
  { value: "weekly", label: "Weekly on certain days" },
  { value: "monthly_day", label: "Monthly on a date" },
  { value: "monthly_last", label: "Monthly on the last day" },
  { value: "monthly_nth", label: "Monthly on e.g. 2nd Saturday" },
  { value: "yearly", label: "Yearly on a date" },
  { value: "custom", label: "Custom (RRULE)" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayOf(date: DateStr): Weekday {
  return WEEKDAYS[(toUtcDate(date).getUTCDay() + 6) % 7];
}

function initialState(values: ChoreFormValues | undefined, today: DateStr, me: string): State {
  const start = values?.startDate ?? today;
  const d = toUtcDate(start);
  const s: State = {
    title: values?.title ?? "",
    notes: values?.notes ?? "",
    startDate: start,
    repeat: "weekly",
    interval: "1",
    weekdays: [weekdayOf(start)],
    monthDay: String(d.getUTCDate()),
    nth: "1",
    nthWeekday: weekdayOf(start),
    yearMonth: String(d.getUTCMonth() + 1),
    yearDay: String(d.getUTCDate()),
    customRrule: "",
    until: "",
    scheduleMode: values?.scheduleMode ?? "fixed",
    assignmentMode: values?.assignmentMode ?? "fixed",
    assigneeId: values?.assigneeId ?? me,
    rotationIds: values?.rotationIds ?? [],
    rotationStartId: "",
  };
  const spec: RecurrenceSpec | undefined = values?.spec;
  if (!spec) return s;
  s.repeat = spec.kind;
  if ("interval" in spec) s.interval = String(spec.interval);
  if ("until" in spec) s.until = spec.until ?? "";
  if (spec.kind === "weekly") s.weekdays = spec.weekdays;
  if (spec.kind === "monthly_day") s.monthDay = String(spec.day);
  if (spec.kind === "monthly_nth") {
    s.nth = String(spec.nth);
    s.nthWeekday = spec.weekday;
  }
  if (spec.kind === "yearly") {
    s.yearMonth = String(spec.month);
    s.yearDay = String(spec.day);
  }
  if (spec.kind === "custom") s.customRrule = spec.rrule;
  return s;
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
  const [state, action] = useActionState(choreId ? updateChoreAction : createChoreAction, null);
  const [s, setS] = useState<State>(() => initialState(values, today, meId));
  const set = <K extends keyof State>(key: K, value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const preview = usePreview(s, today);
  const fieldError = (name: string) =>
    state && !state.ok && state.fieldErrors?.[name] ? (
      <span className="text-sm text-destructive">{state.fieldErrors[name][0]}</span>
    ) : null;

  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const unit = { daily: "day(s)", weekly: "week(s)", monthly_day: "month(s)", monthly_last: "month(s)", monthly_nth: "month(s)", yearly: "year(s)" } as Record<string, string>;

  return (
    <form action={action} className="flex flex-col gap-4">
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="repeat">Repeats</Label>
          <NativeSelect id="repeat" name="repeat" value={s.repeat} onChange={(e) => set("repeat", e.target.value as RepeatKind)}>
            {REPEAT_OPTIONS.map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        {s.repeat !== "once" && s.repeat !== "custom" ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Every</span>
            <Input name="interval" type="number" min={1} max={365} value={s.interval} onChange={(e) => set("interval", e.target.value)} className="w-20" />
            <span>{unit[s.repeat]}</span>
            {fieldError("interval")}
          </div>
        ) : null}

        {s.repeat === "weekly" ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm">On</span>
            <div className="flex flex-wrap gap-3">
              {WEEKDAYS.map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="weekdays" value={d} checked={s.weekdays.includes(d)} onChange={() => set("weekdays", toggle(s.weekdays, d))} />
                  {WEEKDAY_LABELS[d]}
                </label>
              ))}
            </div>
            {fieldError("weekdays")}
          </div>
        ) : null}

        {s.repeat === "monthly_day" ? (
          <div className="flex items-center gap-2 text-sm">
            <span>On day</span>
            <Input name="monthDay" type="number" min={1} max={31} value={s.monthDay} onChange={(e) => set("monthDay", e.target.value)} className="w-20" />
            <span className="text-muted-foreground">(29–31 fall back to the month&apos;s last day)</span>
            {fieldError("monthDay")}
          </div>
        ) : null}

        {s.repeat === "monthly_nth" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>On the</span>
            <NativeSelect name="nth" value={s.nth} onChange={(e) => set("nth", e.target.value)}>
              <NativeSelectOption value="1">first</NativeSelectOption>
              <NativeSelectOption value="2">second</NativeSelectOption>
              <NativeSelectOption value="3">third</NativeSelectOption>
              <NativeSelectOption value="4">fourth</NativeSelectOption>
              <NativeSelectOption value="-1">last</NativeSelectOption>
            </NativeSelect>
            <NativeSelect name="nthWeekday" value={s.nthWeekday} onChange={(e) => set("nthWeekday", e.target.value as Weekday)}>
              {WEEKDAYS.map((d) => (
                <NativeSelectOption key={d} value={d}>
                  {WEEKDAY_LABELS[d]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        ) : null}

        {s.repeat === "yearly" ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>On</span>
            <Input name="yearDay" type="number" min={1} max={31} value={s.yearDay} onChange={(e) => set("yearDay", e.target.value)} className="w-20" />
            <NativeSelect name="yearMonth" value={s.yearMonth} onChange={(e) => set("yearMonth", e.target.value)}>
              {MONTHS.map((m, i) => (
                <NativeSelectOption key={m} value={String(i + 1)}>
                  {m}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("yearDay")}
          </div>
        ) : null}

        {s.repeat === "custom" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="customRrule">RRULE</Label>
            <Input id="customRrule" name="customRrule" value={s.customRrule} onChange={(e) => set("customRrule", e.target.value)} placeholder="FREQ=MONTHLY;BYDAY=2SA,4SA" />
            <span className="text-xs text-muted-foreground">
              Standard iCalendar RRULE without DTSTART. Example above: 2nd and 4th Saturday every month.
            </span>
            {fieldError("customRrule")}
          </div>
        ) : null}

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
      <SubmitButton pendingText="Saving…">{choreId ? "Save changes" : "Create chore"}</SubmitButton>
    </form>
  );
}
