import { TIMEZONE } from "@/lib/config";
import { isDateStr, todayIn, type DateStr } from "@/lib/domain/dates";

/**
 * "Today" in IST. In development you can pretend it's another day by setting
 * GHARKAAM_FAKE_TODAY=YYYY-MM-DD (ignored in production).
 */
export function today(): DateStr {
  const fake = process.env.GHARKAAM_FAKE_TODAY;
  if (fake && process.env.NODE_ENV !== "production" && isDateStr(fake)) return fake;
  return todayIn(TIMEZONE);
}

/** The IST calendar date of a timestamp. */
export function dateOf(at: Date): DateStr {
  return todayIn(TIMEZONE, at);
}
