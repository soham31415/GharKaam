import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import * as q from "@/lib/db/queries/profiles";
import type { Profile } from "@/lib/types";
import type { ProfileInput, ProfileUpdateInput } from "@/lib/validation/profiles";
import { AppError } from "./errors";
import { toProfile } from "./mappers";

/**
 * Profile rules:
 * - The very first profile is created without an admin and becomes admin.
 * - After that only admins add, edit, archive or restore profiles (honour system).
 * - There must always be at least one active admin.
 * - Active profile names are unique (case-insensitive).
 */

export function assertAdmin(actor: Profile): void {
  if (!actor.isAdmin) throw new AppError("forbidden", "Only admin profiles can do this.");
}

export async function getProfilePickerData(): Promise<{ profiles: Profile[]; isFirstRun: boolean }> {
  const rows = await q.listActiveProfiles(getDb());
  return { profiles: rows.map(toProfile), isFirstRun: rows.length === 0 };
}

export async function listProfilesForManagement(): Promise<{ active: Profile[]; archived: Profile[] }> {
  const db = getDb();
  const [active, archived] = await Promise.all([q.listActiveProfiles(db), q.listArchivedProfiles(db)]);
  return { active: active.map(toProfile), archived: archived.map(toProfile) };
}

export async function listActiveProfiles(): Promise<Profile[]> {
  return (await q.listActiveProfiles(getDb())).map(toProfile);
}

export async function createFirstProfile(input: ProfileInput): Promise<Profile> {
  return getDb().transaction(async (tx) => {
    // Serialise concurrent first-run submissions.
    await tx.execute(sql`lock table profiles in share row exclusive mode`);
    if ((await q.countActiveProfiles(tx)) > 0) {
      throw new AppError("conflict", "Profiles already exist. Ask an admin to add you.");
    }
    const row = await q.insertProfile(tx, { name: input.name, avatar: input.avatar, isAdmin: true, sortOrder: 0 });
    return toProfile(row);
  });
}

export async function createProfile(actor: Profile, input: ProfileInput & { isAdmin?: boolean }): Promise<Profile> {
  assertAdmin(actor);
  return getDb().transaction(async (tx) => {
    if (await q.findActiveProfileByName(tx, input.name)) {
      throw new AppError("conflict", `There is already a profile called "${input.name}".`);
    }
    const row = await q.insertProfile(tx, {
      name: input.name,
      avatar: input.avatar,
      isAdmin: input.isAdmin ?? false,
      sortOrder: await q.nextProfileSortOrder(tx),
    });
    return toProfile(row);
  });
}

export async function updateProfile(actor: Profile, input: ProfileUpdateInput): Promise<Profile> {
  assertAdmin(actor);
  return getDb().transaction(async (tx) => {
    const existing = await q.findProfileById(tx, input.id);
    if (!existing) throw new AppError("not_found", "Profile not found.");

    const sameName = await q.findActiveProfileByName(tx, input.name);
    if (sameName && sameName.id !== input.id) {
      throw new AppError("conflict", `There is already a profile called "${input.name}".`);
    }
    if (existing.isAdmin && !input.isAdmin && !existing.archivedAt && (await q.countActiveAdmins(tx)) <= 1) {
      throw new AppError("conflict", "At least one profile has to stay admin.");
    }

    const row = await q.updateProfile(tx, input.id, {
      name: input.name,
      avatar: input.avatar,
      isAdmin: input.isAdmin,
    });
    return toProfile(row!);
  });
}

export async function archiveProfile(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  if (actor.id === id) {
    throw new AppError("conflict", "You can't archive the profile you're using. Switch to another admin first.");
  }
  await getDb().transaction(async (tx) => {
    const existing = await q.findProfileById(tx, id);
    if (!existing || existing.archivedAt) throw new AppError("not_found", "Profile not found.");
    if (existing.isAdmin && (await q.countActiveAdmins(tx)) <= 1) {
      throw new AppError("conflict", "At least one profile has to stay admin.");
    }
    await q.updateProfile(tx, id, { archivedAt: new Date() });
  });
}

export async function restoreProfile(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    const existing = await q.findProfileById(tx, id);
    if (!existing || !existing.archivedAt) throw new AppError("not_found", "Profile not found.");
    if (await q.findActiveProfileByName(tx, existing.name)) {
      throw new AppError("conflict", `Rename the active "${existing.name}" profile first.`);
    }
    await q.updateProfile(tx, id, { archivedAt: null });
  });
}
