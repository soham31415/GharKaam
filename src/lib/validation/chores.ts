import { z } from "zod";
import { isDateStr, type DateStr } from "@/lib/domain/dates";
import type { RecurrenceSpec } from "@/lib/domain/recurrence";
import { uuid } from "./form";
import { buildRecurrenceSpec, recurrenceFields, strOrList, toList } from "./recurrence";

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

/** Raw form fields. Fields for other repeat kinds may be present and are ignored. */
const rawSchema = z.object({
  title: z.string().trim().min(1, "Give the chore a name").max(80, "Keep the name under 80 characters"),
  notes: z.string().trim().max(500, "Keep notes under 500 characters").optional(),
  startDate: z.string().refine(isDateStr, "Pick a valid start date"),
  ...recurrenceFields,
  until: str,
  scheduleMode: z.enum(["fixed", "after_completion"]).optional(),
  assignmentMode: z.enum(["fixed", "rotation", "anyone"], { message: "Choose who does it" }),
  assigneeId: str,
  rotationIds: strOrList,
  rotationStartId: str,
});

export const choreInputSchema = rawSchema.transform((raw, ctx): ChoreInput => {
  const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

  const until = raw.until?.trim() ? raw.until.trim() : null;
  if (until !== null && !isDateStr(until)) issue("until", "Pick a valid end date");
  else if (until !== null && until < raw.startDate) issue("until", "The end date must be on or after the start date");

  const scheduleMode = raw.repeat === "once" ? "fixed" : (raw.scheduleMode ?? "fixed");
  const spec: RecurrenceSpec = buildRecurrenceSpec(raw, issue, { until, allowCount: scheduleMode === "fixed" });

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
