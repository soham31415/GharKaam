"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { toUtcDate, type DateStr } from "@/lib/domain/dates";
import { WEEKDAY_LABELS, WEEKDAYS, type RecurrenceSpec, type RepeatKind, type Weekday } from "@/lib/domain/recurrence";

/** Controlled state for the "how often" picker. Field names match the form fields the server parses. */
export type RecurrenceState = {
  repeat: RepeatKind;
  interval: string;
  weekdays: Weekday[];
  monthDay: string;
  nth: string;
  nthWeekday: Weekday;
  yearMonth: string;
  yearDay: string;
  customRrule: string;
};

export type RepeatOption = { value: RepeatKind; label: string };

export const CHORE_REPEAT_OPTIONS: RepeatOption[] = [
  { value: "once", label: "Never (just one day)" },
  { value: "daily", label: "Every N days" },
  { value: "weekly", label: "Weekly on certain days" },
  { value: "monthly_day", label: "Monthly on a date" },
  { value: "monthly_last", label: "Monthly on the last day" },
  { value: "monthly_nth", label: "Monthly on e.g. 2nd Saturday" },
  { value: "yearly", label: "Yearly on a date" },
  { value: "custom", label: "Custom (RRULE)" },
];

export const RESTOCK_REPEAT_OPTIONS: RepeatOption[] = [
  { value: "once", label: "No schedule (only when marked running low)" },
  { value: "daily", label: "Every N days" },
  { value: "weekly", label: "Weekly on certain days" },
  { value: "monthly_day", label: "Monthly on a date" },
  { value: "monthly_last", label: "Monthly on the last day" },
  { value: "monthly_nth", label: "Monthly on e.g. 2nd Saturday" },
  { value: "custom", label: "Custom (RRULE)" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNIT: Partial<Record<RepeatKind, string>> = {
  daily: "day(s)",
  weekly: "week(s)",
  monthly_day: "month(s)",
  monthly_last: "month(s)",
  monthly_nth: "month(s)",
  yearly: "year(s)",
};

function weekdayOf(date: DateStr): Weekday {
  return WEEKDAYS[(toUtcDate(date).getUTCDay() + 6) % 7];
}

/** Starting values: from an existing spec, or sensible defaults based on `anchor` (e.g. its weekday). */
export function initialRecurrence(spec: RecurrenceSpec | undefined, anchor: DateStr, defaultKind: RepeatKind): RecurrenceState {
  const d = toUtcDate(anchor);
  const s: RecurrenceState = {
    repeat: defaultKind,
    interval: "1",
    weekdays: [weekdayOf(anchor)],
    monthDay: String(d.getUTCDate()),
    nth: "1",
    nthWeekday: weekdayOf(anchor),
    yearMonth: String(d.getUTCMonth() + 1),
    yearDay: String(d.getUTCDate()),
    customRrule: "",
  };
  if (!spec) return s;
  s.repeat = spec.kind;
  if ("interval" in spec) s.interval = String(spec.interval);
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

/** The repeat-kind select plus the fields for the chosen kind. */
export function RecurrenceFields({
  value: s,
  onChange,
  options,
  label = "Repeats",
  fieldError,
}: {
  value: RecurrenceState;
  onChange: (patch: Partial<RecurrenceState>) => void;
  options: RepeatOption[];
  label?: string;
  fieldError: (name: string) => ReactNode;
}) {
  const toggle = (d: Weekday) => (s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d]);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="repeat">{label}</Label>
        <NativeSelect id="repeat" name="repeat" value={s.repeat} onChange={(e) => onChange({ repeat: e.target.value as RepeatKind, interval: "1" })}>
          {options.map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {s.repeat !== "once" && s.repeat !== "custom" ? (
        <div className="flex items-center gap-2 text-sm">
          <span>Every</span>
          <Input name="interval" type="number" min={1} max={365} value={s.interval} onChange={(e) => onChange({ interval: e.target.value })} className="w-20" />
          <span>{UNIT[s.repeat]}</span>
          {fieldError("interval")}
        </div>
      ) : null}

      {s.repeat === "weekly" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm">On</span>
          <div className="flex flex-wrap gap-3">
            {WEEKDAYS.map((d) => (
              <label key={d} className="flex items-center gap-1 text-sm">
                <input type="checkbox" name="weekdays" value={d} checked={s.weekdays.includes(d)} onChange={() => onChange({ weekdays: toggle(d) })} />
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
          <Input name="monthDay" type="number" min={1} max={31} value={s.monthDay} onChange={(e) => onChange({ monthDay: e.target.value })} className="w-20" />
          <span className="text-muted-foreground">(29–31 fall back to the month&apos;s last day)</span>
          {fieldError("monthDay")}
        </div>
      ) : null}

      {s.repeat === "monthly_nth" ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>On the</span>
          <NativeSelect name="nth" value={s.nth} onChange={(e) => onChange({ nth: e.target.value })}>
            <NativeSelectOption value="1">first</NativeSelectOption>
            <NativeSelectOption value="2">second</NativeSelectOption>
            <NativeSelectOption value="3">third</NativeSelectOption>
            <NativeSelectOption value="4">fourth</NativeSelectOption>
            <NativeSelectOption value="-1">last</NativeSelectOption>
          </NativeSelect>
          <NativeSelect name="nthWeekday" value={s.nthWeekday} onChange={(e) => onChange({ nthWeekday: e.target.value as Weekday })}>
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
          <Input name="yearDay" type="number" min={1} max={31} value={s.yearDay} onChange={(e) => onChange({ yearDay: e.target.value })} className="w-20" />
          <NativeSelect name="yearMonth" value={s.yearMonth} onChange={(e) => onChange({ yearMonth: e.target.value })}>
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
          <Input id="customRrule" name="customRrule" value={s.customRrule} onChange={(e) => onChange({ customRrule: e.target.value })} placeholder="FREQ=MONTHLY;BYDAY=2SA,4SA" />
          <span className="text-xs text-muted-foreground">
            Standard iCalendar RRULE without DTSTART. Example above: 2nd and 4th Saturday every month.
          </span>
          {fieldError("customRrule")}
        </div>
      ) : null}
    </>
  );
}
