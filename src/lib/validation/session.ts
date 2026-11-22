import { z } from "zod";

export const unlockSchema = z.object({
  passcode: z.string().min(1, "Enter the family passcode").max(200),
  next: z.string().optional(),
});

/** Only allow redirecting to a local path after unlocking (no open redirects). */
export function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/profiles";
  if (next.startsWith("/unlock")) return "/profiles";
  return next;
}
