import { Frequency, RRule } from "rrule";
import { daysInMonth, formatDate, fromUtcDate, isDateStr, toUtcDate, type DateStr } from "./dates";

/**
 * The recurrence engine. Schedules are stored as an RRULE body (no DTSTART,
 * e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TH"). The form works with a friendlier
 * `RecurrenceSpec`, which converts to and from that string.
 *
 * All dates are date-only and run through rrule as UTC-midnight Dates, so the
 * server's timezone never matters.
 */

export const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
  SU: "Sun",
};
const WEEKDAY_LONG: Record<Weekday, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const NTH_VALUES = [1, 2, 3, 4, -1] as const;
export type Nth = (typeof NTH_VALUES)[number];

export const REPEAT_KINDS = [
  "once",
  "daily",
  "weekly",
  "monthly_day",
  "monthly_last",
  "monthly_nth",
  "yearly",
  "custom",
] as const;
export type RepeatKind = (typeof REPEAT_KINDS)[number];

type Until = { until: DateStr | null };
export type RecurrenceSpec =
  | { kind: "once" }
  | ({ kind: "daily"; interval: number } & Until)
  | ({ kind: "weekly"; interval: number; weekdays: Weekday[] } & Until)
  | ({ kind: "monthly_day"; interval: number; day: number } & Until)
  | ({ kind: "monthly_last"; interval: number } & Until)
  | ({ kind: "monthly_nth"; interval: number; nth: Nth; weekday: Weekday } & Until)
  | ({ kind: "yearly"; interval: number; month: number; day: number } & Until)
  | { kind: "custom"; rrule: string };

// ── Spec → RRULE ────────────────────────────────────────────────────────────

function untilPart(until: DateStr | null): string[] {
  return until ? [`UNTIL=${until.replace(/-/g, "")}T000000Z`] : [];
}

/** BYMONTHDAY that falls back to the month's last day when `day` doesn't exist (e.g. 31st in April). */
function clampedMonthDay(day: number): string[] {
  if (day <= 28) return [`BYMONTHDAY=${day}`];
  const days = [];
  for (let d = 28; d <= day; d++) days.push(d);
  return [`BYMONTHDAY=${days.join(",")}`, "BYSETPOS=-1"];
}

/** Returns the RRULE body, or null for a one-time chore. */
export function specToRRule(spec: RecurrenceSpec): string | null {
  switch (spec.kind) {
    case "once":
      return null;
    case "custom":
      return normalizeRRule(spec.rrule);
    case "daily":
      return ["FREQ=DAILY", `INTERVAL=${spec.interval}`, ...untilPart(spec.until)].join(";");
    case "weekly": {
      const days = WEEKDAYS.filter((d) => spec.weekdays.includes(d));
      return ["FREQ=WEEKLY", `INTERVAL=${spec.interval}`, `BYDAY=${days.join(",")}`, ...untilPart(spec.until)].join(
        ";",
      );
    }
    case "monthly_day":
      return ["FREQ=MONTHLY", `INTERVAL=${spec.interval}`, ...clampedMonthDay(spec.day), ...untilPart(spec.until)].join(
        ";",
      );
    case "monthly_last":
      return ["FREQ=MONTHLY", `INTERVAL=${spec.interval}`, "BYMONTHDAY=-1", ...untilPart(spec.until)].join(";");
    case "monthly_nth":
      return [
        "FREQ=MONTHLY",
        `INTERVAL=${spec.interval}`,
        `BYDAY=${spec.nth}${spec.weekday}`,
        ...untilPart(spec.until),
      ].join(";");
    case "yearly": {
      const day = spec.month === 2 && spec.day === 29 ? ["BYMONTHDAY=28,29", "BYSETPOS=-1"] : [`BYMONTHDAY=${spec.day}`];
      return ["FREQ=YEARLY", `INTERVAL=${spec.interval}`, `BYMONTH=${spec.month}`, ...day, ...untilPart(spec.until)].join(
        ";",
      );
    }
  }
}

// ── RRULE → Spec (for editing) ──────────────────────────────────────────────

export function normalizeRRule(value: string): string {
  return value
    .trim()
    .replace(/^RRULE:/i, "")
    .toUpperCase()
    .replace(/\s+/g, "");
}

function parts(rrule: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of normalizeRRule(rrule).split(";")) {
    if (!part) continue;
    const [k, v] = part.split("=");
    map.set(k, v ?? "");
  }
  return map;
}

function parseUntil(value: string | undefined): DateStr | null | undefined {
  if (value === undefined) return null;
  const m = /^(\d{4})(\d{2})(\d{2})(T000000Z?)?$/.exec(value);
  if (!m) return undefined; // has a time of day → not representable by the form
  const d = `${m[1]}-${m[2]}-${m[3]}`;
  return isDateStr(d) ? d : undefined;
}

const PRESET_KEYS = new Set(["FREQ", "INTERVAL", "BYDAY", "BYMONTHDAY", "BYSETPOS", "BYMONTH", "UNTIL"]);

/** Best-effort inverse of specToRRule; anything unusual becomes "custom". */
export function rruleToSpec(rrule: string | null): RecurrenceSpec {
  if (!rrule) return { kind: "once" };
  const custom: RecurrenceSpec = { kind: "custom", rrule: normalizeRRule(rrule) };
  const p = parts(rrule);
  if ([...p.keys()].some((k) => !PRESET_KEYS.has(k))) return custom;

  const intervalText = p.get("INTERVAL") ?? "1";
  if (!/^\d+$/.test(intervalText)) return custom;
  const interval = Number(intervalText);
  const until = parseUntil(p.get("UNTIL"));
  if (until === undefined || interval < 1) return custom;

  const byday = p.get("BYDAY");
  const bymonthday = p.get("BYMONTHDAY");
  const bysetpos = p.get("BYSETPOS");
  const bymonth = p.get("BYMONTH");
  const has = (...keys: string[]) => [...p.keys()].every((k) => ["FREQ", "INTERVAL", "UNTIL", ...keys].includes(k));

  switch (p.get("FREQ")) {
    case "DAILY":
      return has() ? { kind: "daily", interval, until } : custom;

    case "WEEKLY": {
      if (!has("BYDAY") || !byday) return custom;
      const days = byday.split(",");
      if (!days.every((d) => (WEEKDAYS as readonly string[]).includes(d))) return custom;
      return { kind: "weekly", interval, weekdays: WEEKDAYS.filter((d) => days.includes(d)), until };
    }

    case "MONTHLY": {
      if (has("BYMONTHDAY") && bymonthday === "-1") return { kind: "monthly_last", interval, until };
      if (has("BYMONTHDAY") && bymonthday && /^\d+$/.test(bymonthday)) {
        const day = Number(bymonthday);
        return day >= 1 && day <= 28 ? { kind: "monthly_day", interval, day, until } : custom;
      }
      if (has("BYMONTHDAY", "BYSETPOS") && bysetpos === "-1" && bymonthday) {
        for (let day = 29; day <= 31; day++) {
          if (clampedMonthDay(day)[0] === `BYMONTHDAY=${bymonthday}`) return { kind: "monthly_day", interval, day, until };
        }
        return custom;
      }
      if (has("BYDAY") && byday) {
        const m = /^(-1|[1-4])(MO|TU|WE|TH|FR|SA|SU)$/.exec(byday);
        if (m) return { kind: "monthly_nth", interval, nth: Number(m[1]) as Nth, weekday: m[2] as Weekday, until };
      }
      return custom;
    }

    case "YEARLY": {
      if (!bymonth || !/^\d+$/.test(bymonth)) return custom;
      const month = Number(bymonth);
      if (month < 1 || month > 12) return custom;
      if (has("BYMONTH", "BYMONTHDAY", "BYSETPOS") && month === 2 && bymonthday === "28,29" && bysetpos === "-1") {
        return { kind: "yearly", interval, month, day: 29, until };
      }
      if (has("BYMONTH", "BYMONTHDAY") && bymonthday && /^\d+$/.test(bymonthday)) {
        const day = Number(bymonthday);
        const max = month === 2 ? 28 : daysInMonth(2001, month);
        return day >= 1 && day <= max ? { kind: "yearly", interval, month, day, until } : custom;
      }
      return custom;
    }

    default:
      return custom;
  }
}

// ── Validation ──────────────────────────────────────────────────────────────

/** Returns an error message, or null if the RRULE is usable. */
export function validateRRule(rrule: string, opts: { allowCount: boolean }): string | null {
  const body = normalizeRRule(rrule);
  if (!body) return "Enter a repeat rule.";
  if (/DTSTART|TZID|\n/.test(body)) return "Leave out DTSTART/TZID; the start date is set separately.";
  const p = parts(body);
  if (["BYHOUR", "BYMINUTE", "BYSECOND"].some((k) => p.has(k))) return "Times of day aren't supported, only dates.";
  if (p.has("COUNT") && !opts.allowCount) {
    return "\"After N times\" (COUNT) can't be used with \"after last done\". Use an end date (UNTIL) instead.";
  }
  let options;
  try {
    options = RRule.parseString(body);
  } catch {
    return "That isn't a valid RRULE.";
  }
  if (options.freq === undefined) return "The rule needs a FREQ (e.g. FREQ=WEEKLY).";
  if (options.freq > Frequency.DAILY) return "Repeating more often than daily isn't supported.";
  if (options.interval !== undefined && (options.interval < 1 || options.interval > 1000)) {
    return "INTERVAL must be between 1 and 1000.";
  }
  return null;
}

// ── Occurrence calculations ─────────────────────────────────────────────────

function buildRule(rrule: string, dtstart: DateStr): RRule {
  return new RRule({ ...RRule.parseString(normalizeRRule(rrule)), dtstart: toUtcDate(dtstart) });
}

/** First occurrence on or after `date` (series anchored at `dtstart`). */
export function firstOnOrAfter(rrule: string, dtstart: DateStr, date: DateStr): DateStr | null {
  const d = buildRule(rrule, dtstart).after(toUtcDate(date), true);
  return d ? fromUtcDate(d) : null;
}

/** First occurrence strictly after `date` (series anchored at `dtstart`). */
export function firstAfter(rrule: string, dtstart: DateStr, date: DateStr): DateStr | null {
  const d = buildRule(rrule, dtstart).after(toUtcDate(date), false);
  return d ? fromUtcDate(d) : null;
}

/** Up to `count` occurrences on or after `from`. */
export function upcomingDates(rrule: string, dtstart: DateStr, from: DateStr, count: number): DateStr[] {
  const rule = buildRule(rrule, dtstart);
  const out: DateStr[] = [];
  let d = rule.after(toUtcDate(from), true);
  while (d && out.length < count) {
    out.push(fromUtcDate(d));
    d = rule.after(d, false);
  }
  return out;
}

// ── Descriptions ────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
}

function every(interval: number, unit: string): string {
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
}

/** Plain-English description of a schedule, e.g. "Every 2 weeks on Mon, Thu". */
export function describeSpec(spec: RecurrenceSpec): string {
  const until = "until" in spec && spec.until ? `, until ${formatDate(spec.until)}` : "";
  switch (spec.kind) {
    case "once":
      return "One time";
    case "daily":
      return every(spec.interval, "day") + until;
    case "weekly":
      return `${every(spec.interval, "week")} on ${spec.weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ")}${until}`;
    case "monthly_day":
      return `${every(spec.interval, "month")} on the ${ordinal(spec.day)}${
        spec.day > 28 ? " (or the last day of shorter months)" : ""
      }${until}`;
    case "monthly_last":
      return `${every(spec.interval, "month")} on the last day${until}`;
    case "monthly_nth":
      return `${every(spec.interval, "month")} on the ${spec.nth === -1 ? "last" : ordinal(spec.nth)} ${
        WEEKDAY_LONG[spec.weekday]
      }${until}`;
    case "yearly":
      return `${every(spec.interval, "year")} on ${spec.day} ${MONTHS[spec.month - 1]}${
        spec.month === 2 && spec.day === 29 ? " (28 Feb in other years)" : ""
      }${until}`;
    case "custom":
      try {
        const text = RRule.fromString(spec.rrule).toText();
        return `Custom: ${text.charAt(0).toUpperCase()}${text.slice(1)}`;
      } catch {
        return `Custom: ${spec.rrule}`;
      }
  }
}

export function describeRRule(rrule: string | null): string {
  return describeSpec(rruleToSpec(rrule));
}
