"use client";

import { cn } from "cn";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { createChoreAction, updateChoreAction } from "@/actions/chores";
import { DatePill, FieldError, Segmented } from "@/components/form/controls";
import { Avatar } from "@/components/people/avatar";
import { useSession } from "@/components/people/session-context";
import { initialRecurrence, type RecurrenceState } from "@/components/recurrence/recurrence-fields";
import { Section } from "@/components/shell/grouped";
import { Button } from "@/components/ui/button";
import { formatDate, isDateStr, toUtcDate, type DateStr } from "@/lib/domain/dates";
import { previewDueDates } from "@/lib/domain/occurrences";
import { describeSpec, specToRRule, WEEKDAYS, type Weekday } from "@/lib/domain/recurrence";
import type { ChoreFormValues } from "@/lib/types";
import { choreInputSchema } from "@/lib/validation/chores";
import { turnLabel, turnOrder } from "@/lib/view/people";
import { applyMoreOption, applyPreset, MORE_OPTIONS, presetHint, presetOf, type Preset } from "@/lib/view/repeat-presets";

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

const PRESETS: Preset[] = ["once", "daily", "weekdays", "weekly", "monthly", "more"];
const PRESET_LABEL: Record<Preset, string> = {
  once: "Once",
  daily: "Daily",
  weekdays: "Weekdays",
  weekly: "Weekly",
  monthly: "Monthly",
  more: "More…",
};
const DAY_BUTTONS: { day: Weekday; short: string; full: string }[] = [
  { day: "MO", short: "M", full: "Monday" },
  { day: "TU", short: "T", full: "Tuesday" },
  { day: "WE", short: "W", full: "Wednesday" },
  { day: "TH", short: "T", full: "Thursday" },
  { day: "FR", short: "F", full: "Friday" },
  { day: "SA", short: "S", full: "Saturday" },
  { day: "SU", short: "S", full: "Sunday" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNIT: Record<string, string> = { daily: "day", weekly: "week", monthly_day: "month", monthly_last: "month", monthly_nth: "month", yearly: "year" };
/** Errors shown next to their own field; anything else is shown at the bottom. */
const INLINE_ERRORS = new Set([
  "title",
  "startDate",
  "until",
  "interval",
  "monthDay",
  "yearDay",
  "customRrule",
  "weekdays",
  "assigneeId",
  "rotationIds",
  "rotationStartId",
]);

function weekdayOf(date: string): Weekday {
  return isDateStr(date) ? WEEKDAYS[(toUtcDate(date).getUTCDay() + 6) % 7] : "MO";
}

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
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the schedule", text: "", dates: [] as DateStr[] };
    const { spec, startDate, scheduleMode } = parsed.data;
    try {
      const dates = previewDueDates({ rrule: specToRRule(spec), startDate, scheduleMode }, today, 5);
      const text =
        spec.kind === "once"
          ? `Doesn't repeat (${formatDate(startDate, today)})`
          : scheduleMode === "after_completion"
            ? `${describeSpec(spec)}, counted from when it was last done`
            : describeSpec(spec);
      return { error: null, text, dates };
    } catch {
      return { error: "That rule can't be previewed.", text: "", dates: [] as DateStr[] };
    }
  }, [s, today]);
}

/** Inline card holding fields, rows split by hairlines (the form's own grouped style). */
function FormCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("overflow-hidden rounded-field bg-card [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-separator", className)}>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 px-4 py-2">
      <span className="text-base">{label}</span>
      {children}
    </div>
  );
}

const smallSelect =
  "h-9 appearance-none rounded-pill bg-neutral py-0 pr-7 pl-2.5 text-[15px] font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40";

function Select({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={smallSelect}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={3} />
    </span>
  );
}

const numberInput =
  "h-9 w-16 rounded-pill bg-neutral px-2 text-center text-[15px] font-semibold tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/40";

/**
 * New / edit chore. Presented as a bottom sheet (see NewChoreSheet) or a page.
 * Every value is kept in state and submitted through hidden inputs with the
 * same field names the server action has always parsed.
 */
export function ChoreForm({
  choreId,
  values,
  today,
  formId = "chore-form",
  onSaved,
}: {
  /** Present when editing. */
  choreId?: string;
  values?: ChoreFormValues;
  today: DateStr;
  formId?: string;
  /** Called after a successful save (edit mode; creating navigates to the new chore). */
  onSaved?: () => void;
}) {
  const { me, people } = useSession();
  const [state, action, pending] = useActionState(choreId ? updateChoreAction : createChoreAction, null);
  const [s, setS] = useState<State>(() => initialState(values, today, me?.id ?? ""));
  const [preset, setPreset] = useState<Preset>(() => presetOf(s));
  const set = <K extends keyof State>(key: K, value: State[K]) => setS((prev) => ({ ...prev, [key]: value }));
  const preview = usePreview(s, today);
  const repeats = s.repeat !== "once";

  const onSavedRef = useRef(onSaved);
  useEffect(() => {
    onSavedRef.current = onSaved;
  });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) onSavedRef.current?.();
    // After a failed save, bring the first problem into view (the Create button may be far away).
    if (state && !state.ok) formRef.current?.querySelector("[role=alert]")?.scrollIntoView({ block: "center" });
  }, [state]);

  // Submit via onSubmit rather than <form action>: React resets a form after an
  // action, which would wipe the controlled fields on screen.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  };

  const fieldError = (name: string) => (state && !state.ok ? state.fieldErrors?.[name]?.[0] : undefined);
  const anchor = weekdayOf(s.startDate);
  const startDay = isDateStr(s.startDate) ? toUtcDate(s.startDate).getUTCDate() : 1;

  const pickPreset = (p: Preset) => {
    setPreset(p);
    setS((prev) => ({ ...prev, ...applyPreset(p, prev, anchor), ...(p === "monthly" ? { monthDay: String(startDay) } : {}) }));
  };

  const changeStart = (date: string) =>
    setS((prev) => ({
      ...prev,
      startDate: date,
      // "Monthly on the 22nd" follows the start date.
      ...(preset === "monthly" && isDateStr(date) ? { monthDay: String(toUtcDate(date).getUTCDate()) } : {}),
    }));

  const toggleDay = (d: Weekday) =>
    set("weekdays", s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d]);

  const familyOrder = people.map((p) => p.id);
  const order = turnOrder(familyOrder, s.rotationIds, s.rotationStartId || null);
  const pickPerson = (id: string) => {
    if (s.assignmentMode === "fixed") set("assigneeId", id);
    else set("rotationIds", s.rotationIds.includes(id) ? s.rotationIds.filter((x) => x !== id) : [...s.rotationIds, id]);
  };
  const changeWho = (mode: State["assignmentMode"]) =>
    setS((prev) => ({
      ...prev,
      assignmentMode: mode,
      // Starting a rotation: begin with the person it was assigned to.
      rotationIds: mode === "rotation" && prev.rotationIds.length === 0 && prev.assigneeId ? [prev.assigneeId] : prev.rotationIds,
    }));

  const showInterval = preset === "more" && s.repeat !== "custom";

  return (
    <form ref={formRef} id={formId} onSubmit={submit} className="flex flex-col gap-[22px]" noValidate>
      {choreId ? <input type="hidden" name="id" value={choreId} /> : null}
      <input type="hidden" name="startDate" value={s.startDate} />
      {repeats ? <input type="hidden" name="until" value={s.until} /> : null}
      <input type="hidden" name="repeat" value={s.repeat} />
      <input type="hidden" name="interval" value={s.interval} />
      {s.weekdays.map((d) => (
        <input key={d} type="hidden" name="weekdays" value={d} />
      ))}
      <input type="hidden" name="monthDay" value={s.monthDay} />
      <input type="hidden" name="nth" value={s.nth} />
      <input type="hidden" name="nthWeekday" value={s.nthWeekday} />
      <input type="hidden" name="yearMonth" value={s.yearMonth} />
      <input type="hidden" name="yearDay" value={s.yearDay} />
      <input type="hidden" name="customRrule" value={s.customRrule} />
      <input type="hidden" name="scheduleMode" value={repeats ? s.scheduleMode : "fixed"} />
      <input type="hidden" name="assignmentMode" value={s.assignmentMode} />
      {s.assignmentMode === "fixed" ? <input type="hidden" name="assigneeId" value={s.assigneeId} /> : null}
      {s.assignmentMode === "rotation" ? (
        <>
          {/* Submitted in family order, regardless of tick order. */}
          {familyOrder
            .filter((id) => s.rotationIds.includes(id))
            .map((id) => (
              <input key={id} type="hidden" name="rotationIds" value={id} />
            ))}
          {!choreId ? <input type="hidden" name="rotationStartId" value={s.rotationStartId} /> : null}
        </>
      ) : null}

      {/* Name and notes */}
      <div className="flex flex-col gap-1.5">
        <FormCard>
          <label className="flex flex-col px-4 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Chore</span>
            <input
              name="title"
              value={s.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={80}
              required
              autoComplete="off"
              placeholder="e.g. Take out trash"
              aria-invalid={Boolean(fieldError("title"))}
              className="bg-transparent pt-0.5 text-lg font-semibold outline-none placeholder:font-normal placeholder:text-tertiary"
            />
          </label>
          <label className="flex flex-col px-4 py-2.5">
            <span className="text-xs font-semibold text-muted-foreground">Notes (optional)</span>
            <textarea
              name="notes"
              value={s.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={500}
              rows={1}
              placeholder="e.g. Wet and dry bins separately"
              className="field-sizing-content resize-none bg-transparent pt-0.5 text-base outline-none placeholder:text-tertiary"
            />
          </label>
        </FormCard>
        <div className="px-4">
          <FieldError>{fieldError("title")}</FieldError>
        </div>
      </div>

      {/* How often */}
      <Section label="How often" className="gap-2">
        <div role="radiogroup" aria-label="How often" className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const on = preset === p;
            return (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pickPreset(p)}
                className={cn(
                  "pressable flex h-16 flex-col items-center justify-center gap-0.5 rounded-field",
                  on ? "bg-primary text-primary-foreground" : "border-[1.5px] border-bar-border bg-card text-foreground",
                )}
              >
                <span className="text-[15px] font-bold">{PRESET_LABEL[p]}</span>
                <span className="text-[11.5px] font-medium opacity-85">{presetHint(p, startDay)}</span>
              </button>
            );
          })}
        </div>

        <FormCard className="mt-1.5">
          {preset === "more" ? (
            <div role="radiogroup" aria-label="Other schedules" className="flex flex-col [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-separator">
              {MORE_OPTIONS.map((o) => {
                const on = s.repeat === o.repeat;
                return (
                  <button
                    key={o.repeat}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setS((prev) => ({ ...prev, ...applyMoreOption(o.repeat, prev, anchor) }))}
                    className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5 text-left text-base"
                  >
                    {o.label}
                    {on ? <Check aria-hidden="true" className="size-[18px] text-primary" strokeWidth={3} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {showInterval ? (
            <Row label="Every">
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  aria-label="Repeat every"
                  value={s.interval}
                  onChange={(e) => set("interval", e.target.value)}
                  className={numberInput}
                />
                <span className="text-base text-muted-foreground">
                  {UNIT[s.repeat]}
                  {s.interval.trim() === "1" ? "" : "s"}
                </span>
              </span>
            </Row>
          ) : null}

          {s.repeat === "weekly" ? (
            <div className="flex flex-col gap-2.5 px-4 py-3">
              <span className="text-[15px] font-medium">On these days</span>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_BUTTONS.map((d) => {
                  const on = s.weekdays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.full}
                      onClick={() => toggleDay(d.day)}
                      className={cn(
                        "pressable h-10 rounded-full text-sm font-bold",
                        on ? "bg-primary text-primary-foreground" : "bg-neutral text-[#3A3A3C] dark:text-[#D1D1D6]",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              <FieldError>{s.weekdays.length === 0 ? "Pick at least one day of the week" : fieldError("weekdays")}</FieldError>
            </div>
          ) : null}

          {preset === "more" && s.repeat === "monthly_day" ? (
            <Row label="On day">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={31}
                aria-label="Day of the month"
                value={s.monthDay}
                onChange={(e) => set("monthDay", e.target.value)}
                className={numberInput}
              />
            </Row>
          ) : null}

          {s.repeat === "monthly_nth" ? (
            <Row label="On the">
              <span className="flex gap-1.5">
                <Select label="Which week" value={s.nth} onChange={(v) => set("nth", v)}>
                  <option value="1">first</option>
                  <option value="2">second</option>
                  <option value="3">third</option>
                  <option value="4">fourth</option>
                  <option value="-1">last</option>
                </Select>
                <Select label="Day of the week" value={s.nthWeekday} onChange={(v) => set("nthWeekday", v as Weekday)}>
                  {DAY_BUTTONS.map((d) => (
                    <option key={d.day} value={d.day}>
                      {d.full}
                    </option>
                  ))}
                </Select>
              </span>
            </Row>
          ) : null}

          {s.repeat === "yearly" ? (
            <Row label="On">
              <span className="flex gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  aria-label="Day"
                  value={s.yearDay}
                  onChange={(e) => set("yearDay", e.target.value)}
                  className={numberInput}
                />
                <Select label="Month" value={s.yearMonth} onChange={(v) => set("yearMonth", v)}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1)}>
                      {m}
                    </option>
                  ))}
                </Select>
              </span>
            </Row>
          ) : null}

          {s.repeat === "custom" ? (
            <label className="flex flex-col gap-1 px-4 py-3">
              <span className="text-[15px] font-medium">Repeat rule (RRULE)</span>
              <input
                value={s.customRrule}
                onChange={(e) => set("customRrule", e.target.value)}
                placeholder="FREQ=MONTHLY;BYDAY=2SA,4SA"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className="h-10 rounded-pill bg-neutral px-3 font-mono text-[15px] outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
              />
              <span className="text-[12.5px] text-muted-foreground">
                Standard iCalendar rule without DTSTART. The example is the 2nd and 4th Saturday of every month.
              </span>
            </label>
          ) : null}

          <Row label={repeats ? "Starting from" : "Due date"}>
            <DatePill value={s.startDate} onChange={changeStart} today={today} label={repeats ? "Starting from" : "Due date"} />
          </Row>

          {repeats ? (
            <Row label="Ends">
              <DatePill
                value={s.until}
                onChange={(v) => set("until", v)}
                today={today}
                label="End date"
                placeholder="Never"
                clearable
                min={s.startDate}
              />
            </Row>
          ) : null}
        </FormCard>
        {fieldError("startDate") || fieldError("until") || fieldError("interval") || fieldError("monthDay") || fieldError("yearDay") || fieldError("customRrule") ? (
          <div className="px-4">
            <FieldError>
              {fieldError("startDate") ?? fieldError("until") ?? fieldError("interval") ?? fieldError("monthDay") ?? fieldError("yearDay") ?? fieldError("customRrule")}
            </FieldError>
          </div>
        ) : null}

        {repeats ? (
          <div className="mt-1.5 flex flex-col gap-2">
            <span className="section-label px-4">Count the next date</span>
            <div role="radiogroup" aria-label="Count the next date" className="grid grid-cols-2 gap-2">
              {(
                [
                  ["fixed", "On the calendar", "Bins every Tuesday, even if done late"],
                  ["after_completion", "From last done", "Water plants 3 days after the last watering"],
                ] as const
              ).map(([mode, label, sub]) => {
                const on = s.scheduleMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set("scheduleMode", mode)}
                    className={cn(
                      "pressable flex flex-col gap-[3px] rounded-field border-2 bg-card p-3 text-left",
                      on ? "border-primary" : "border-transparent",
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-[15px] font-bold">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-[18px] shrink-0 rounded-full transition-[border-width] duration-150 ease-out",
                          on ? "border-[6px] border-primary" : "border-2 border-[#C7C7CC] dark:border-[#48484A]",
                        )}
                      />
                      {label}
                    </span>
                    <span className="text-[12.5px] leading-[1.35] text-muted-foreground">{sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Live preview */}
        <div
          aria-live="polite"
          className={cn(
            "mt-1.5 flex flex-col gap-2.5 rounded-field px-4 py-3.5 transition-colors duration-200",
            preview.error ? "bg-danger" : "bg-soon",
          )}
        >
          <span
            className={cn(
              "flex items-start gap-2 text-[15px] leading-snug font-bold",
              preview.error ? "text-danger-foreground" : "text-soon-foreground",
            )}
          >
            <CalendarDays aria-hidden="true" className="mt-px size-[18px] shrink-0" strokeWidth={2.2} />
            {preview.error ?? preview.text}
          </span>
          {!preview.error ? (
            preview.dates.length === 0 ? (
              <span className="text-[13px] text-soon-foreground">No upcoming dates. Check the start and end dates.</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {preview.dates.map((d) => (
                  <span key={d} className="rounded-[9px] bg-card px-2.5 py-[5px] text-[13.5px] font-semibold text-[#3A3A3C] dark:text-[#E5E5EA]">
                    {formatDate(d, today)}
                  </span>
                ))}
              </div>
            )
          ) : null}
          {!preview.error && repeats && s.scheduleMode === "after_completion" && preview.dates.length > 0 ? (
            <span className="text-[12.5px] text-soon-foreground">…then depends on when it&apos;s done</span>
          ) : null}
        </div>
      </Section>

      {/* Who */}
      <Section label="Who does it" className="gap-2">
        <Segmented
          label="Who does it"
          value={s.assignmentMode}
          onChange={changeWho}
          options={[
            { value: "fixed", label: "One person" },
            { value: "rotation", label: "Take turns" },
            { value: "anyone", label: "Anyone" },
          ]}
        />
        {s.assignmentMode === "anyone" ? (
          <div className="rounded-field bg-card px-4 py-3.5 text-[14.5px] text-secondary-foreground">
            Shows under “Anyone can do” on everyone&apos;s Today. Whoever gets to it first taps Done.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <FormCard>
              {people.map((p) => {
                const on = s.assignmentMode === "fixed" ? s.assigneeId === p.id : s.rotationIds.includes(p.id);
                const pos = order.get(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickPerson(p.id)}
                    aria-pressed={on}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
                  >
                    <Avatar person={p} size="sm" />
                    <span className="flex-1 text-base">
                      {p.name}
                      {p.id === me?.id ? <span className="text-muted-foreground"> (you)</span> : null}
                    </span>
                    {s.assignmentMode === "rotation" && on && pos ? (
                      <span className="rounded-[7px] bg-soon px-2 py-0.5 text-[12.5px] font-bold text-soon-foreground">
                        {turnLabel(pos, !choreId)}
                      </span>
                    ) : null}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full transition-colors duration-150",
                        on ? "bg-primary" : "border-2 border-[#C7C7CC] dark:border-[#48484A]",
                      )}
                    >
                      {on ? <Check className="size-3.5 text-primary-foreground" strokeWidth={3.2} /> : null}
                    </span>
                  </button>
                );
              })}
              {s.assignmentMode === "rotation" && !choreId && s.rotationIds.length > 1 ? (
                <Row label="First turn">
                  <Select label="First turn" value={s.rotationStartId} onChange={(v) => set("rotationStartId", v)}>
                    <option value="">First in the list</option>
                    {people
                      .filter((p) => s.rotationIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                </Row>
              ) : null}
            </FormCard>
            <span className="px-4 text-[12.5px] text-muted-foreground">
              {s.assignmentMode === "rotation"
                ? "Turns go in family order. Tick who takes part."
                : "Defaults to you. Tap someone else to hand it over."}
            </span>
            <div className="px-4">
              <FieldError>{fieldError("assigneeId") ?? fieldError("rotationIds") ?? fieldError("rotationStartId")}</FieldError>
            </div>
          </div>
        )}
      </Section>

      {state && !state.ok && Object.keys(state.fieldErrors ?? { _: 1 }).some((k) => !INLINE_ERRORS.has(k)) ? (
        <p role="alert" className="rounded-field bg-danger px-4 py-3 text-sm font-semibold text-danger-foreground">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (choreId ? "Saving…" : "Creating…") : choreId ? "Save changes" : "Create chore"}
      </Button>
    </form>
  );
}
