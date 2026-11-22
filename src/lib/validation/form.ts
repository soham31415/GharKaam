import { z } from "zod";

/** Helpers for turning FormData into plain objects zod can validate. */

export function formToObject(formData: FormData): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION")) continue; // Next.js internals
    if (typeof value !== "string") continue;
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else out[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return out;
}

// Note: in zod 4 a missing object key only passes if the schema is `.optional()`
// (a union with z.undefined() is not enough), hence `.optional()` below.

/** Checkbox/switch: present ("on" or "true") means true, absent means false. */
export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

/** Optional text: trims, and turns "" / missing into null. */
export const optionalText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max, `Keep it under ${max} characters`))
    .transform((v) => (v === "" ? null : v));

export const uuid = z.uuid({ message: "Invalid id" });
