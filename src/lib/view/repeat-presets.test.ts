import { describe, expect, it } from "vitest";
import { applyMoreOption, applyPreset, MON_TO_FRI, presetHint, presetOf, type RepeatState } from "./repeat-presets";

const s = (patch: Partial<RepeatState>): RepeatState => ({ repeat: "weekly", interval: "1", weekdays: ["TU"], ...patch });

describe("presetOf", () => {
  it("maps simple schedules onto presets", () => {
    expect(presetOf(s({ repeat: "once" }))).toBe("once");
    expect(presetOf(s({ repeat: "daily" }))).toBe("daily");
    expect(presetOf(s({ weekdays: ["TU", "FR"] }))).toBe("weekly");
    expect(presetOf(s({ weekdays: [...MON_TO_FRI].reverse() }))).toBe("weekdays");
    expect(presetOf(s({ repeat: "monthly_day" }))).toBe("monthly");
  });

  it("puts intervals above 1 and the special kinds under More", () => {
    expect(presetOf(s({ repeat: "daily", interval: "3" }))).toBe("more");
    expect(presetOf(s({ interval: "2" }))).toBe("more");
    expect(presetOf(s({ repeat: "monthly_day", interval: "3" }))).toBe("more");
    expect(presetOf(s({ repeat: "monthly_last" }))).toBe("more");
    expect(presetOf(s({ repeat: "monthly_nth" }))).toBe("more");
    expect(presetOf(s({ repeat: "yearly" }))).toBe("more");
    expect(presetOf(s({ repeat: "custom" }))).toBe("more");
  });
});

describe("applyPreset", () => {
  it("sets the repeat kind and resets the interval", () => {
    expect(applyPreset("daily", s({ repeat: "daily", interval: "4" }), "SU")).toEqual({ repeat: "daily", interval: "1" });
    expect(applyPreset("weekdays", s({}), "SU")).toEqual({ repeat: "weekly", interval: "1", weekdays: MON_TO_FRI });
    expect(applyPreset("monthly", s({}), "SU")).toEqual({ repeat: "monthly_day", interval: "1" });
    expect(applyPreset("once", s({}), "SU")).toEqual({ repeat: "once", interval: "1" });
  });

  it("Weekly keeps picked days, but not the Mon–Fri set from Weekdays", () => {
    expect(applyPreset("weekly", s({ weekdays: ["TU", "FR"] }), "SU").weekdays).toEqual(["TU", "FR"]);
    expect(applyPreset("weekly", s({ weekdays: MON_TO_FRI }), "SU").weekdays).toEqual(["SU"]);
    expect(applyPreset("weekly", s({ repeat: "daily" }), "SU").weekdays).toEqual(["SU"]);
  });

  it("More keeps a special schedule and otherwise starts on 'last day of the month'", () => {
    expect(applyPreset("more", s({ repeat: "yearly" }), "SU")).toEqual({});
    expect(applyPreset("more", s({ repeat: "daily", interval: "3" }), "SU")).toEqual({});
    expect(applyPreset("more", s({ repeat: "daily" }), "SU")).toEqual({ repeat: "monthly_last", interval: "1" });
  });
});

describe("applyMoreOption", () => {
  it("starts 'every few' options at 2 and keeps a custom interval", () => {
    expect(applyMoreOption("daily", s({ interval: "1" }), "SU")).toEqual({ repeat: "daily", interval: "2" });
    expect(applyMoreOption("monthly_day", s({ interval: "3" }), "SU")).toEqual({ repeat: "monthly_day", interval: "3" });
    expect(applyMoreOption("yearly", s({ interval: "3" }), "SU")).toEqual({ repeat: "yearly", interval: "1" });
  });

  it("gives weekly a day when none is picked", () => {
    expect(applyMoreOption("weekly", s({ weekdays: [] }), "SA").weekdays).toEqual(["SA"]);
  });
});

describe("presetHint", () => {
  it("names the start day for Monthly", () => {
    expect(presetHint("monthly", 22)).toBe("on the 22nd");
    expect(presetHint("monthly", 11)).toBe("on the 11th");
    expect(presetHint("monthly", 1)).toBe("on the 1st");
  });
});
