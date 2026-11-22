import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { COOKIE_MAX_AGE_SECONDS, DEVICE_COOKIE, PROFILE_COOKIE } from "@/lib/config";
import { getDb } from "@/lib/db/client";
import { findProfileById } from "@/lib/db/queries/profiles";
import { getSessionEnv } from "@/lib/env";
import type { Profile } from "@/lib/types";
import { createDeviceToken, passcodeMatches, verifyDeviceToken } from "./device-token";
import { AppError } from "./errors";
import { toProfile } from "./mappers";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

/** Checks the family passcode and, if right, remembers this device. */
export async function unlockDevice(passcode: string): Promise<boolean> {
  const { FAMILY_PASSCODE, SESSION_SECRET } = getSessionEnv();
  if (!(await passcodeMatches(passcode, FAMILY_PASSCODE))) return false;
  const token = await createDeviceToken(SESSION_SECRET, FAMILY_PASSCODE, Date.now());
  (await cookies()).set(DEVICE_COOKIE, token, cookieBase);
  return true;
}

export async function lockDevice(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEVICE_COOKIE);
  jar.delete(PROFILE_COOKIE);
}

export async function isDeviceUnlocked(): Promise<boolean> {
  const { FAMILY_PASSCODE, SESSION_SECRET } = getSessionEnv();
  const token = (await cookies()).get(DEVICE_COOKIE)?.value;
  return verifyDeviceToken(token, SESSION_SECRET, FAMILY_PASSCODE, Date.now());
}

/** The profile picked on this device, or null. Deduplicated per request. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!(await isDeviceUnlocked())) return null;
  const id = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!id || !isUuid(id)) return null;
  const row = await findProfileById(getDb(), id);
  if (!row || row.archivedAt) return null;
  return toProfile(row);
});

/** For pages and actions that need someone picked. Redirects to the picker otherwise. */
export async function requireProfile(): Promise<Profile> {
  if (!(await isDeviceUnlocked())) redirect("/unlock");
  const profile = await getCurrentProfile();
  if (!profile) redirect("/profiles");
  return profile;
}

/** Honour-system admin check (anyone can pick an admin profile). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.isAdmin) throw new AppError("forbidden", "Only admin profiles can do this.");
  return profile;
}

export async function setCurrentProfile(id: string): Promise<Profile> {
  if (!(await isDeviceUnlocked())) redirect("/unlock");
  const row = isUuid(id) ? await findProfileById(getDb(), id) : undefined;
  if (!row || row.archivedAt) throw new AppError("not_found", "That profile no longer exists.");
  (await cookies()).set(PROFILE_COOKIE, row.id, cookieBase);
  return toProfile(row);
}

export async function clearCurrentProfile(): Promise<void> {
  (await cookies()).delete(PROFILE_COOKIE);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
