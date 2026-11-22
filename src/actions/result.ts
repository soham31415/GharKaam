import { z } from "zod";
import { isAppError } from "@/lib/services/errors";

/**
 * What every server action returns to the UI. Not a "use server" file, so it
 * can export types and sync helpers.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type ActionState<T = undefined> = ActionResult<T> | null;

export function ok<T>(data: T, message?: string): ActionResult<T> {
  return { ok: true, data, message };
}

/**
 * Converts expected failures (zod validation, AppError) into a result.
 * Anything else is re-thrown so real bugs surface — this also lets Next.js
 * redirect()/notFound() errors pass through untouched.
 */
export function fail(e: unknown): { ok: false; error: string; fieldErrors?: Record<string, string[]> } {
  if (e instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "_";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return { ok: false, error: e.issues[0]?.message ?? "Please check the form.", fieldErrors };
  }
  if (isAppError(e)) return { ok: false, error: e.message };
  throw e;
}
