/**
 * The "How often" preset grid on the chore form, mapped onto the existing
 * repeat options. Pure, no React.
 *
 *   Once      = never
 *   Daily     = every 1 day
 *   Weekdays  = weekly, Mon to Fri
 *   Weekly    = weekly on chosen days
 *   Monthly   = monthly on the start date's day
 *   More…     = everything else (every N days/weeks/months, last day, Nth weekday, yearly, custom)
 */

import type { RepeatKind, Weekday } from "@/lib/domain/recurrence";

export type Preset = "once" | "daily" | "weekdays" | "weekly" | "monthly" | "more";

export type RepeatState = { repeat: RepeatKind; interval: string; weekdays: Weekday[] };

export const MON_TO_FRI: Weekday[] = ["MO", "TU", "WE", "TH", "FR"];

/** The options listed under "More…", one per repeat kind. */
export const MORE_OPTIONS: { repeat: RepeatKind; label: string }[] = [
  { repeat: "daily", label: "Every few days" },
  { repeat: "weekly", label: "Every few weeks, on certain days" },
  { repeat: "monthly_day", label: "Every few months, on a date" },
  { repeat: "monthly_last", label: "Monthly on the last day" },
  { repeat: "monthly_nth", label: "Monthly on e.g. 2nd Saturday" },
  { repeat: "yearly", label: "Yearly on a date" },
  { repeat: "custom", label: "Custom rule" },
];

const isOne = (interval: string) => interval.trim() === "" || interval.trim() === "1";
const sameDays = (a: Weekday[], b: Weekday[]) => a.length === b.length && b.every((d) => a.includes(d));

/** Which preset an existing schedule belongs to (used when the form opens). */
export function presetOf(s: RepeatState): Preset {
  switch (s.repeat) {
    case "once":
      return "once";
    case "daily":
      return isOne(s.interval) ? "daily" : "more";
    case "weekly":
      if (!isOne(s.interval)) return "more";
      return sameDays(s.weekdays, MON_TO_FRI) ? "weekdays" : "weekly";
    case "monthly_day":
      return isOne(s.interval) ? "monthly" : "more";
    default:
      return "more";
  }
}

/** The state change for tapping a preset. `anchor` is the start date's weekday. */
export function applyPreset(preset: Preset, s: RepeatState, anchor: Weekday): Partial<RepeatState> {
  switch (preset) {
    case "once":
      return { repeat: "once", interval: "1" };
    case "daily":
      return { repeat: "daily", interval: "1" };
    case "weekdays":
      return { repeat: "weekly", interval: "1", weekdays: MON_TO_FRI };
    case "weekly": {
      const keep = s.repeat === "weekly" && s.weekdays.length > 0 && !sameDays(s.weekdays, MON_TO_FRI);
      return { repeat: "weekly", interval: "1", weekdays: keep ? s.weekdays : [anchor] };
    }
    case "monthly":
      return { repeat: "monthly_day", interval: "1" };
    case "more": {
      const special: RepeatKind[] = ["monthly_last", "monthly_nth", "yearly", "custom"];
      return special.includes(s.repeat) || !isOne(s.interval) ? {} : { repeat: "monthly_last", interval: "1" };
    }
  }
}

/** The state change for picking an option under "More…". "Every few…" options start at 2. */
export function applyMoreOption(repeat: RepeatKind, s: RepeatState, anchor: Weekday): Partial<RepeatState> {
  const everyFew: RepeatKind[] = ["daily", "weekly", "monthly_day"];
  const interval = everyFew.includes(repeat) ? (isOne(s.interval) ? "2" : s.interval) : "1";
  const patch: Partial<RepeatState> = { repeat, interval };
  if (repeat === "weekly" && s.weekdays.length === 0) patch.weekdays = [anchor];
  return patch;
}

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

/** Small line under each preset button. */
export function presetHint(preset: Preset, startDay: number): string {
  switch (preset) {
    case "once":
      return "just one day";
    case "daily":
      return "every day";
    case "weekdays":
      return "Mon to Fri";
    case "weekly":
      return "pick days";
    case "monthly":
      return `on the ${ordinal(startDay)}`;
    case "more":
      return "last day, 2nd Sat…";
  }
}
