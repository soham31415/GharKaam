import { z } from "zod";
import { daysInMonth, isDateStr, type DateStr } from "@/lib/domain/dates";
import {
  NTH_VALUES,
  REPEAT_KINDS,
  validateRRule,
  WEEKDAYS,
  type Nth,
  type RecurrenceSpec,
  type Weekday,
} from "@/lib/domain/recurrence";
import { uuid } from "./form";

/** What the chore service needs, after the form has been validated. */
export type ChoreInput = {
  title: string;
  notes: string | null;
  startDate: DateStr;
  spec: RecurrenceSpec;
  scheduleMode: "fixed" | "after_completion";
  assignment: {
    mode: "fixed" | "rotation" | "anyone";
    assigneeId: string | null;
    /** In rotation order. */
    rotationIds: string[];
    /** Who gets the first turn (new chores only). */
    rotationStartId: string | null;
  };
};

const str = z.string().optional();
const strOrList = z.union([z.string(), z.array(z.string())]).optional();
const toList = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);

/** Raw form fields. Fields for other repeat kinds may be present and are ignored. */
const rawSchema = z.object({
  title: z.string().trim().min(1, "Give the chore a name").max(80, "Keep the name under 80 characters"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
  startDate: z.string().refine(isDateStr, "Pick a valid start date"),
  repeat: z.enum(REPEAT_KINDS, { message: "Pick how often it repeats" }),
  interval: str,
  weekdays: strOrList,
  monthDay: str,
  nth: str,
  nthWeekday: str,
  yearMonth: str,
  yearDay: str,
  customRrule: str,
  until: str,
  scheduleMode: z.enum(["fixed", "after_completion"]).optional(),
  assignmentMode: z.enum(["fixed", "rotation", "anyone"], { message: "Choose who does it" }),
  assigneeId: str,
  rotationIds: strOrList,
  rotationStartId: str,
});

function intIn(value: string | undefined, min: number, max: number): number | null {
  if (!value || !/^-?\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

export const choreInputSchema = rawSchema.transform((raw, ctx): ChoreInput => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

  const until = raw.until?.trim() ? raw.until.trim() : null;
  if (until !== null && !isDateStr(until)) issue("until", "Pick a valid end date");
  else if (until !== null && until < raw.startDate) issue("until", "The end date must be on or after the start date");

  const interval = raw.repeat === "once" || raw.repeat === "custom" ? 1 : intIn(raw.interval ?? "1", 1, 365);
  if (interval === null) issue("interval", "Repeat every 1 to 365");
  const every = interval ?? 1;

  const scheduleMode = raw.repeat === "once" ? "fixed" : (raw.scheduleMode ?? "fixed");

  let spec: RecurrenceSpec = { kind: "once" };
  switch (raw.repeat) {
    case "once":
      break;
    case "daily":
      spec = { kind: "daily", interval: every, until };
      break;
    case "weekly": {
      const picked = toList(raw.weekdays);
      const days = WEEKDAYS.filter((d) => picked.includes(d)); // calendar order, unknown values dropped
      if (days.length === 0) issue("weekdays", "Pick at least one day of the week");
      spec = { kind: "weekly", interval: every, weekdays: days, until };
      break;
    }
    case "monthly_day": {
      const day = intIn(raw.monthDay, 1, 31);
      if (day === null) issue("monthDay", "Pick a day of the month (1–31)");
      spec = { kind: "monthly_day", interval: every, day: day ?? 1, until };
      break;
    }
    case "monthly_last":
      spec = { kind: "monthly_last", interval: every, until };
      break;
    case "monthly_nth": {
      const nth = intIn(raw.nth, -1, 4);
      const weekday = raw.nthWeekday as Weekday;
      if (nth === null || !(NTH_VALUES as readonly number[]).includes(nth)) issue("nth", "Pick first, second, third, fourth or last");
      if (!(WEEKDAYS as readonly string[]).includes(weekday)) issue("nthWeekday", "Pick a day of the week");
      spec = { kind: "monthly_nth", interval: every, nth: (nth ?? 1) as Nth, weekday: weekday ?? "MO", until };
      break;
    }
    case "yearly": {
      const month = intIn(raw.yearMonth, 1, 12);
      const day = month ? intIn(raw.yearDay, 1, month === 2 ? 29 : daysInMonth(2001, month)) : null;
      if (month === null) issue("yearMonth", "Pick a month");
      else if (day === null) issue("yearDay", "That day doesn't exist in that month");
      spec = { kind: "yearly", interval: every, month: month ?? 1, day: day ?? 1, until };
      break;
    }
    case "custom": {
      const rrule = raw.customRrule ?? "";
      const error = validateRRule(rrule, { allowCount: scheduleMode === "fixed" });
      if (error) issue("customRrule", error);
      spec = { kind: "custom", rrule };
      break;
    }
  }

  const assigneeId = raw.assigneeId?.trim() || null;
  const rotationIds = toList(raw.rotationIds);
  const rotationStartId = raw.rotationStartId?.trim() || null;
  if (raw.assignmentMode === "fixed") {
    if (!assigneeId || !uuid.safeParse(assigneeId).success) issue("assigneeId", "Pick who does this chore");
  }
  if (raw.assignmentMode === "rotation") {
    if (rotationIds.length === 0) issue("rotationIds", "Pick the people who take turns");
    if (new Set(rotationIds).size !== rotationIds.length) issue("rotationIds", "Each person can only be in the rotation once");
    if (!rotationIds.every((r) => uuid.safeParse(r).success)) issue("rotationIds", "Invalid person in the rotation");
    if (rotationStartId && !rotationIds.includes(rotationStartId)) issue("rotationStartId", "The first turn must be someone in the rotation");
  }

  return {
    title: raw.title,
    notes: raw.notes ? raw.notes : null,
    startDate: raw.startDate,
    spec,
    scheduleMode,
    assignment: {
      mode: raw.assignmentMode,
      assigneeId: raw.assignmentMode === "fixed" ? assigneeId : null,
      rotationIds: raw.assignmentMode === "rotation" ? rotationIds : [],
      rotationStartId: raw.assignmentMode === "rotation" ? rotationStartId : null,
    },
  };
});

export const occurrenceIdSchema = z.object({ id: uuid });

export const closeOccurrenceSchema = z.object({
  id: uuid,
  status: z.enum(["done", "skipped"]),
});

export const reassignSchema = z.object({
  id: uuid,
  /** "" = anyone */
  assigneeId: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null)
    .refine((v) => v === null || uuid.safeParse(v).success, "Invalid person"),
});

export const moveSchema = z.object({
  id: uuid,
  dueDate: z.string().refine(isDateStr, "Pick a valid date"),
});

export const choreIdSchema = z.object({ id: uuid });
