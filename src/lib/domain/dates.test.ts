import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatDate, isDateStr, maxDate, relativeDueLabel, todayIn } from "./dates";

describe("todayIn (Asia/Kolkata)", () => {
  it("switches date at IST midnight, which is 18:30 UTC", () => {
    expect(todayIn("Asia/Kolkata", new Date("2026-11-22T18:29:59Z"))).toBe("2026-11-22");
    expect(todayIn("Asia/Kolkata", new Date("2026-11-22T18:30:00Z"))).toBe("2026-11-23");
  });

  it("is ahead of UTC in the early IST morning", () => {
    // 02:30 UTC on the 22nd is 08:00 IST on the 22nd; 20:00 UTC on the 21st is 01:30 IST on the 22nd
    expect(todayIn("Asia/Kolkata", new Date("2026-11-22T02:30:00Z"))).toBe("2026-11-22");
    expect(todayIn("Asia/Kolkata", new Date("2026-11-21T20:00:00Z"))).toBe("2026-11-22");
  });
});

describe("date strings", () => {
  it("validates real calendar dates only", () => {
    expect(isDateStr("2026-11-22")).toBe(true);
    expect(isDateStr("2028-02-29")).toBe(true);
    expect(isDateStr("2026-02-29")).toBe(false);
    expect(isDateStr("2026-13-01")).toBe(false);
    expect(isDateStr("2026-1-1")).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-22", 45)).toBe("2027-01-06");
  });

  it("measures day differences and picks the later date", () => {
    expect(daysBetween("2026-11-20", "2026-11-22")).toBe(2);
    expect(daysBetween("2026-11-22", "2026-11-20")).toBe(-2);
    expect(maxDate("2026-11-22", "2026-12-01")).toBe("2026-12-01");
  });

  it("formats dates for people", () => {
    expect(formatDate("2026-11-22", "2026-01-01")).toBe("Sun 22 Nov");
    expect(formatDate("2027-01-06", "2026-11-22")).toBe("Wed 6 Jan 2027");
    expect(relativeDueLabel("2026-11-22", "2026-11-22")).toBe("Today");
    expect(relativeDueLabel("2026-11-23", "2026-11-22")).toBe("Tomorrow");
    expect(relativeDueLabel("2026-11-21", "2026-11-22")).toBe("Yesterday (overdue)");
    expect(relativeDueLabel("2026-11-19", "2026-11-22")).toBe("3 days overdue");
    expect(relativeDueLabel("2026-11-26", "2026-11-22")).toBe("Thu 26 Nov");
  });
});
