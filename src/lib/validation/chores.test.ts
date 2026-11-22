import { describe, expect, it } from "vitest";
import { choreInputSchema } from "./chores";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const base = { title: "Dishes", startDate: "2026-11-22", assignmentMode: "anyone" };

describe("choreInputSchema", () => {
  it("builds a weekly spec from form fields and ignores fields of other repeat kinds", () => {
    const r = choreInputSchema.parse({ ...base, repeat: "weekly", interval: "2", weekdays: ["TH", "MO"], monthDay: "31" });
    expect(r.spec).toEqual({ kind: "weekly", interval: 2, weekdays: ["MO", "TH"], until: null });
    expect(r.scheduleMode).toBe("fixed");
  });

  it("accepts a single weekday as a plain string", () => {
    expect(choreInputSchema.parse({ ...base, repeat: "weekly", weekdays: "SA" }).spec).toMatchObject({ weekdays: ["SA"] });
  });

  it("forces one-time chores to the fixed mode", () => {
    expect(choreInputSchema.parse({ ...base, repeat: "once", scheduleMode: "after_completion" }).scheduleMode).toBe("fixed");
  });

  it("validates per repeat kind", () => {
    const fails = (extra: Record<string, unknown>) => !choreInputSchema.safeParse({ ...base, ...extra }).success;
    expect(fails({ repeat: "weekly" })).toBe(true); // no weekday
    expect(fails({ repeat: "daily", interval: "0" })).toBe(true);
    expect(fails({ repeat: "monthly_day", monthDay: "32" })).toBe(true);
    expect(fails({ repeat: "yearly", yearMonth: "4", yearDay: "31" })).toBe(true); // 31 April
    expect(fails({ repeat: "yearly", yearMonth: "2", yearDay: "29" })).toBe(false); // clamps in other years
    expect(fails({ repeat: "custom", customRrule: "FREQ=HOURLY" })).toBe(true);
    expect(fails({ repeat: "custom", customRrule: "FREQ=DAILY;COUNT=3", scheduleMode: "after_completion" })).toBe(true);
    expect(fails({ repeat: "daily", until: "2026-11-01" })).toBe(true); // ends before it starts
  });

  it("validates who does it", () => {
    const fails = (extra: Record<string, unknown>) =>
      !choreInputSchema.safeParse({ ...base, repeat: "daily", ...extra }).success;
    expect(fails({ assignmentMode: "fixed" })).toBe(true);
    expect(fails({ assignmentMode: "fixed", assigneeId: A })).toBe(false);
    expect(fails({ assignmentMode: "rotation" })).toBe(true);
    expect(fails({ assignmentMode: "rotation", rotationIds: [A, A] })).toBe(true);
    expect(fails({ assignmentMode: "rotation", rotationIds: [A, B], rotationStartId: "33333333-3333-4333-8333-333333333333" })).toBe(true);
    const ok = choreInputSchema.parse({ ...base, repeat: "daily", assignmentMode: "rotation", rotationIds: [A, B], rotationStartId: B, assigneeId: A });
    expect(ok.assignment).toEqual({ mode: "rotation", assigneeId: null, rotationIds: [A, B], rotationStartId: B });
  });
});
