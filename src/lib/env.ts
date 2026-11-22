import "server-only";
import { z } from "zod";

/**
 * Server-side environment variables, validated lazily per feature so that a
 * missing push key doesn't break the whole app (and `next build` works without
 * runtime secrets).
 */

function read<T extends z.ZodRawShape>(feature: string, shape: T): z.infer<z.ZodObject<T>> {
  const result = z.object(shape).safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing or invalid environment variables for ${feature}: ${missing}. See .env.example.`);
  }
  return result.data;
}

const nonEmpty = z.string().trim().min(1);

let dbEnv: { DATABASE_URL: string } | undefined;
export function getDbEnv() {
  dbEnv ??= read("database", { DATABASE_URL: nonEmpty });
  return dbEnv;
}

let sessionEnv: { FAMILY_PASSCODE: string; SESSION_SECRET: string } | undefined;
export function getSessionEnv() {
  sessionEnv ??= read("passcode gate", {
    FAMILY_PASSCODE: nonEmpty,
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  });
  return sessionEnv;
}

export function getCronEnv() {
  return read("cron", { CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 characters") });
}

export function getPushEnv() {
  return read("web push", {
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: nonEmpty,
    VAPID_PRIVATE_KEY: nonEmpty,
    VAPID_SUBJECT: z.string().startsWith("mailto:").or(z.url()),
  });
}
