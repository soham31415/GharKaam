import { z } from "zod";
import { isDateStr, type DateStr } from "@/lib/domain/dates";
import type { RecurrenceSpec } from "@/lib/domain/recurrence";
import { optionalText, uuid } from "./form";
import { buildRecurrenceSpec, recurrenceFields, strOrList, toList } from "./recurrence";

/** What the inventory service needs, after the form has been validated. */
export type ItemInput = {
  name: string;
  categoryId: string | null;
  unit: string | null;
  /** Decimal string, e.g. "1.5". */
  usualQuantity: string | null;
  notes: string | null;
  /** `once` = no schedule: only bought when marked running low. */
  spec: RecurrenceSpec;
  lastRestockedOn: DateStr | null;
};

const itemName = z.string().trim().min(1, "Give the item a name").max(60, "Keep the name under 60 characters");

/** "" or missing → null; otherwise a uuid. */
const optionalId = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null)
  .refine((v) => v === null || uuid.safeParse(v).success, "Invalid choice");

/** Positive decimal with up to 2 places, e.g. "2", "1.5", "0.25". "" → null. */
export const quantity = optionalText(12).refine(
  (v) => v === null || (/^\d{1,8}(\.\d{1,2})?$/.test(v) && Number(v) > 0),
  "Enter a number like 2 or 1.5",
);

const optionalDate = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null)
  .refine((v) => v === null || isDateStr(v), "Pick a valid date");

export const itemInputSchema = z
  .object({
    name: itemName,
    categoryId: optionalId,
    unit: optionalText(20),
    usualQuantity: quantity,
    notes: optionalText(500),
    lastRestockedOn: optionalDate,
    ...recurrenceFields,
  })
  .transform((raw, ctx): ItemInput => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    // Always counted from the last purchase, so COUNT ("after N times") makes no sense here.
    const spec = buildRecurrenceSpec(raw, issue, { until: null, allowCount: false });
    return {
      name: raw.name,
      categoryId: raw.categoryId,
      unit: raw.unit,
      usualQuantity: raw.usualQuantity,
      notes: raw.notes,
      spec,
      lastRestockedOn: raw.lastRestockedOn,
    };
  });

export const itemIdSchema = z.object({ id: uuid });

export const setLowSchema = z.object({
  id: uuid,
  low: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export const markBoughtSchema = z.object({
  ids: strOrList.transform(toList).pipe(z.array(uuid).min(1, "Tick at least one item")),
  /** Only for a single item; bulk purchases use each item's usual quantity. */
  quantity,
  /** "true" when ticked on the shopping list: items someone else already bought are skipped. */
  fromList: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export const quickAddSchema = z.object({
  name: itemName,
  categoryId: optionalId,
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(40, "Keep the name under 40 characters"),
  sortOrder: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 10000), "Order must be a whole number"),
});

export const categoryUpdateSchema = categoryInputSchema.extend({ id: uuid });

export const categoryIdSchema = z.object({ id: uuid });
