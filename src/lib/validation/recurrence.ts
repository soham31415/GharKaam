import { z } from "zod";
import { daysInMonth } from "@/lib/domain/dates";
import {
  NTH_VALUES,
  REPEAT_KINDS,
  validateRRule,
  WEEKDAYS,
  type Nth,
  type RecurrenceSpec,
  type Weekday,
} from "@/lib/domain/recurrence";

/**
 * Shared form fields for "how often" pickers (chores and restock schedules).
 * Fields belonging to other repeat kinds may be present and are ignored.
 */

const str = z.string().optional();
export const strOrList = z.union([z.string(), z.array(z.string())]).optional();
export const toList = (v: string | string[] | undefined) =>
  (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);

export const recurrenceFields = {
  repeat: z.enum(REPEAT_KINDS, { message: "Pick how often it repeats" }),
  interval: str,
  weekdays: strOrList,
  monthDay: str,
  nth: str,
  nthWeekday: str,
  yearMonth: str,
  yearDay: str,
  customRrule: str,
};

type RawRecurrence = {
  repeat: (typeof REPEAT_KINDS)[number];
  interval?: string;
  weekdays?: string | string[];
  monthDay?: string;
  nth?: string;
  nthWeekday?: string;
  yearMonth?: string;
  yearDay?: string;
  customRrule?: string;
};

export function intIn(value: string | undefined, min: number, max: number): number | null {
  if (!value || !/^-?\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

/** Turns the raw fields into a spec, reporting problems through `issue(field, message)`. */
export function buildRecurrenceSpec(
  raw: RawRecurrence,
  issue: (path: string, message: string) => void,
  opts: { until: string | null; allowCount: boolean },
): RecurrenceSpec {
  const { until } = opts;
  const interval = raw.repeat === "once" || raw.repeat === "custom" ? 1 : intIn(raw.interval ?? "1", 1, 365);
  if (interval === null) issue("interval", "Repeat every 1 to 365");
  const every = interval ?? 1;

  switch (raw.repeat) {
    case "once":
      return { kind: "once" };
    case "daily":
      return { kind: "daily", interval: every, until };
    case "weekly": {
      const picked = toList(raw.weekdays);
      const days = WEEKDAYS.filter((d) => picked.includes(d)); // calendar order, unknown values dropped
      if (days.length === 0) issue("weekdays", "Pick at least one day of the week");
      return { kind: "weekly", interval: every, weekdays: days, until };
    }
    case "monthly_day": {
      const day = intIn(raw.monthDay, 1, 31);
      if (day === null) issue("monthDay", "Pick a day of the month (1–31)");
      return { kind: "monthly_day", interval: every, day: day ?? 1, until };
    }
    case "monthly_last":
      return { kind: "monthly_last", interval: every, until };
    case "monthly_nth": {
      const nth = intIn(raw.nth, -1, 4);
      const weekday = raw.nthWeekday as Weekday;
      if (nth === null || !(NTH_VALUES as readonly number[]).includes(nth)) issue("nth", "Pick first, second, third, fourth or last");
      if (!(WEEKDAYS as readonly string[]).includes(weekday)) issue("nthWeekday", "Pick a day of the week");
      return { kind: "monthly_nth", interval: every, nth: (nth ?? 1) as Nth, weekday: weekday ?? "MO", until };
    }
    case "yearly": {
      const month = intIn(raw.yearMonth, 1, 12);
      const day = month ? intIn(raw.yearDay, 1, month === 2 ? 29 : daysInMonth(2001, month)) : null;
      if (month === null) issue("yearMonth", "Pick a month");
      else if (day === null) issue("yearDay", "That day doesn't exist in that month");
      return { kind: "yearly", interval: every, month: month ?? 1, day: day ?? 1, until };
    }
    case "custom": {
      const rrule = raw.customRrule ?? "";
      const error = validateRRule(rrule, { allowCount: opts.allowCount });
      if (error) issue("customRrule", error);
      return { kind: "custom", rrule };
    }
  }
}
