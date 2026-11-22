/**
 * Date-only helpers. Chores and restocks have no time of day, so dates are
 * plain "YYYY-MM-DD" strings everywhere. Internally a date is represented as a
 * JS Date at UTC midnight, which is also what the rrule library expects.
 */

export type DateStr = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDateStr(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** "YYYY-MM-DD" → Date at 00:00 UTC. */
export function toUtcDate(value: DateStr): Date {
  if (!isDateStr(value)) throw new Error(`Invalid date: ${value}`);
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Date (read in UTC) → "YYYY-MM-DD". */
export function fromUtcDate(date: Date): DateStr {
  return date.toISOString().slice(0, 10);
}

/** The calendar date right now in the given timezone. */
export function todayIn(timeZone: string, now: Date = new Date()): DateStr {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(value: DateStr, days: number): DateStr {
  const d = toUtcDate(value);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

/** b − a in whole days. */
export function daysBetween(a: DateStr, b: DateStr): number {
  return Math.round((toUtcDate(b).getTime() - toUtcDate(a).getTime()) / 86_400_000);
}

export function maxDate(a: DateStr, b: DateStr): DateStr {
  return a >= b ? a : b; // ISO date strings sort chronologically
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 24 Nov" (adds the year when it isn't the reference year). */
export function formatDate(value: DateStr, reference?: DateStr): string {
  const d = toUtcDate(value);
  const base = `${WEEKDAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
  return reference && reference.slice(0, 4) === value.slice(0, 4) ? base : `${base} ${d.getUTCFullYear()}`;
}

/** "Today", "Tomorrow", "Yesterday", "3 days overdue", or a date. */
export function relativeDueLabel(due: DateStr, today: DateStr): string {
  const diff = daysBetween(today, due);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday (overdue)";
  if (diff < 0) return `${-diff} days overdue`;
  return formatDate(due, today);
}

/** "Sun, 22 Nov, 7:45 pm" for a moment in time, shown in the given timezone. */
export function formatTimestamp(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(at);
}
