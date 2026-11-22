import { describe, expect, it } from "vitest";
import {
  describeSpec,
  firstAfter,
  firstOnOrAfter,
  rruleToSpec,
  specToRRule,
  upcomingDates,
  validateRRule,
  type RecurrenceSpec,
} from "./recurrence";

describe("specToRRule", () => {
  it("builds RRULE bodies for every preset", () => {
    expect(specToRRule({ kind: "once" })).toBeNull();
    expect(specToRRule({ kind: "daily", interval: 3, until: null })).toBe("FREQ=DAILY;INTERVAL=3");
    expect(specToRRule({ kind: "weekly", interval: 1, weekdays: ["TH", "MO"], until: null })).toBe(
      "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TH",
    );
    expect(specToRRule({ kind: "monthly_day", interval: 2, day: 15, until: null })).toBe(
      "FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=15",
    );
    expect(specToRRule({ kind: "monthly_day", interval: 1, day: 31, until: null })).toBe(
      "FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=28,29,30,31;BYSETPOS=-1",
    );
    expect(specToRRule({ kind: "monthly_last", interval: 1, until: null })).toBe("FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=-1");
    expect(specToRRule({ kind: "monthly_nth", interval: 1, nth: 2, weekday: "SA", until: null })).toBe(
      "FREQ=MONTHLY;INTERVAL=1;BYDAY=2SA",
    );
    expect(specToRRule({ kind: "yearly", interval: 1, month: 2, day: 29, until: null })).toBe(
      "FREQ=YEARLY;INTERVAL=1;BYMONTH=2;BYMONTHDAY=28,29;BYSETPOS=-1",
    );
    expect(specToRRule({ kind: "daily", interval: 1, until: "2027-03-31" })).toBe(
      "FREQ=DAILY;INTERVAL=1;UNTIL=20270331T000000Z",
    );
    expect(specToRRule({ kind: "custom", rrule: " rrule:freq=weekly;byday=sa " })).toBe("FREQ=WEEKLY;BYDAY=SA");
  });
});

describe("rruleToSpec", () => {
  const presets: RecurrenceSpec[] = [
    { kind: "once" },
    { kind: "daily", interval: 1, until: null },
    { kind: "daily", interval: 45, until: "2027-06-30" },
    { kind: "weekly", interval: 2, weekdays: ["MO", "TH"], until: null },
    { kind: "monthly_day", interval: 1, day: 1, until: null },
    { kind: "monthly_day", interval: 3, day: 29, until: null },
    { kind: "monthly_day", interval: 1, day: 30, until: null },
    { kind: "monthly_day", interval: 1, day: 31, until: "2027-12-31" },
    { kind: "monthly_last", interval: 1, until: null },
    { kind: "monthly_nth", interval: 1, nth: -1, weekday: "SU", until: null },
    { kind: "yearly", interval: 1, month: 8, day: 15, until: null },
    { kind: "yearly", interval: 1, month: 2, day: 29, until: null },
  ];

  it.each(presets.map((s) => [s.kind, s] as const))("round-trips %s", (_kind, spec) => {
    expect(rruleToSpec(specToRRule(spec))).toEqual(spec);
  });

  it("falls back to custom for anything the form can't show", () => {
    for (const r of [
      "FREQ=WEEKLY;INTERVAL=1", // weekly with no weekday
      "FREQ=DAILY;COUNT=5",
      "FREQ=MONTHLY;BYMONTHDAY=31", // skips short months, unlike the preset
      "FREQ=MONTHLY;BYDAY=MO,TU",
      "FREQ=YEARLY;BYMONTH=2;BYMONTHDAY=29",
      "FREQ=DAILY;UNTIL=20270101T120000Z",
    ]) {
      expect(rruleToSpec(r)).toEqual({ kind: "custom", rrule: r });
    }
  });

  it("accepts a missing INTERVAL as 1", () => {
    expect(rruleToSpec("FREQ=DAILY")).toEqual({ kind: "daily", interval: 1, until: null });
  });
});

describe("occurrence dates", () => {
  it("every 45 days counts from the start date", () => {
    expect(upcomingDates("FREQ=DAILY;INTERVAL=45", "2026-11-22", "2026-11-22", 3)).toEqual([
      "2026-11-22",
      "2027-01-06",
      "2027-02-20",
    ]);
  });

  it("monthly on the 31st falls back to the last day of shorter months", () => {
    const rule = specToRRule({ kind: "monthly_day", interval: 1, day: 31, until: null })!;
    expect(upcomingDates(rule, "2027-01-01", "2027-01-01", 4)).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
      "2027-04-30",
    ]);
    expect(firstOnOrAfter(rule, "2027-01-01", "2028-02-01")).toBe("2028-02-29"); // leap year
  });

  it("monthly on the 30th lands on 28 Feb", () => {
    const rule = specToRRule({ kind: "monthly_day", interval: 1, day: 30, until: null })!;
    expect(upcomingDates(rule, "2027-01-01", "2027-01-01", 3)).toEqual(["2027-01-30", "2027-02-28", "2027-03-30"]);
  });

  it("last day of month and Nth weekday", () => {
    expect(upcomingDates("FREQ=MONTHLY;BYMONTHDAY=-1", "2027-01-01", "2027-01-01", 3)).toEqual([
      "2027-01-31",
      "2027-02-28",
      "2027-03-31",
    ]);
    // 2nd Saturday: 12 Dec 2026, 9 Jan 2027
    expect(upcomingDates("FREQ=MONTHLY;BYDAY=2SA", "2026-11-22", "2026-11-22", 2)).toEqual([
      "2026-12-12",
      "2027-01-09",
    ]);
    // last Sunday of November 2026 is the 29th
    expect(firstOnOrAfter("FREQ=MONTHLY;BYDAY=-1SU", "2026-11-01", "2026-11-22")).toBe("2026-11-29");
  });

  it("yearly on 29 Feb uses 28 Feb in other years", () => {
    const rule = specToRRule({ kind: "yearly", interval: 1, month: 2, day: 29, until: null })!;
    expect(upcomingDates(rule, "2027-01-01", "2027-01-01", 3)).toEqual(["2027-02-28", "2028-02-29", "2029-02-28"]);
  });

  it("every 2 weeks on Mon and Thu counts weeks from the start date's week (Mon–Sun)", () => {
    // Start Sun 22 Nov 2026 → its week is 16–22 Nov; next "on" week is 30 Nov–6 Dec.
    expect(upcomingDates("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH", "2026-11-22", "2026-11-22", 4)).toEqual([
      "2026-11-30",
      "2026-12-03",
      "2026-12-14",
      "2026-12-17",
    ]);
  });

  it("stops at UNTIL (inclusive)", () => {
    const rule = "FREQ=DAILY;INTERVAL=1;UNTIL=20261124T000000Z";
    expect(upcomingDates(rule, "2026-11-22", "2026-11-22", 10)).toEqual(["2026-11-22", "2026-11-23", "2026-11-24"]);
    expect(firstAfter(rule, "2026-11-22", "2026-11-24")).toBeNull();
  });

  it("firstAfter is strict, firstOnOrAfter is inclusive", () => {
    expect(firstOnOrAfter("FREQ=WEEKLY;BYDAY=SU", "2026-11-01", "2026-11-22")).toBe("2026-11-22");
    expect(firstAfter("FREQ=WEEKLY;BYDAY=SU", "2026-11-01", "2026-11-22")).toBe("2026-11-29");
  });
});

describe("validateRRule", () => {
  it("accepts normal rules", () => {
    expect(validateRRule("FREQ=WEEKLY;BYDAY=MO", { allowCount: false })).toBeNull();
    expect(validateRRule("RRULE:FREQ=MONTHLY;BYDAY=1MO,3MO", { allowCount: false })).toBeNull();
    expect(validateRRule("FREQ=DAILY;COUNT=3", { allowCount: true })).toBeNull();
  });

  it("rejects what the app can't handle", () => {
    expect(validateRRule("", { allowCount: true })).toMatch(/Enter/);
    expect(validateRRule("not a rule", { allowCount: true })).not.toBeNull();
    expect(validateRRule("FREQ=HOURLY", { allowCount: true })).toMatch(/more often than daily/);
    expect(validateRRule("FREQ=DAILY;BYHOUR=9", { allowCount: true })).toMatch(/Times of day/);
    expect(validateRRule("DTSTART:20260101T000000Z\nRRULE:FREQ=DAILY", { allowCount: true })).toMatch(/DTSTART/);
    expect(validateRRule("FREQ=DAILY;COUNT=3", { allowCount: false })).toMatch(/COUNT/);
    expect(validateRRule("BYDAY=MO", { allowCount: true })).toMatch(/FREQ/);
  });
});

describe("describeSpec", () => {
  it("reads naturally", () => {
    expect(describeSpec({ kind: "daily", interval: 1, until: null })).toBe("Every day");
    expect(describeSpec({ kind: "daily", interval: 45, until: null })).toBe("Every 45 days");
    expect(describeSpec({ kind: "weekly", interval: 2, weekdays: ["MO", "TH"], until: null })).toBe(
      "Every 2 weeks on Mon, Thu",
    );
    expect(describeSpec({ kind: "monthly_day", interval: 1, day: 31, until: null })).toBe(
      "Every month on the 31st (or the last day of shorter months)",
    );
    expect(describeSpec({ kind: "monthly_nth", interval: 1, nth: 2, weekday: "SA", until: null })).toBe(
      "Every month on the 2nd Saturday",
    );
    expect(describeSpec({ kind: "yearly", interval: 1, month: 8, day: 15, until: "2030-08-15" })).toBe(
      "Every year on 15 Aug, until Thu 15 Aug 2030",
    );
    expect(describeSpec({ kind: "custom", rrule: "FREQ=WEEKLY;BYDAY=SA" })).toMatch(/^Custom: Every week on Saturday/);
  });
});
