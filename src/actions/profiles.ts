"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as profiles from "@/lib/services/profiles";
import { isDeviceUnlocked, requireProfile, setCurrentProfile } from "@/lib/services/session";
import { formToObject } from "@/lib/validation/form";
import {
  createProfileSchema,
  profileIdSchema,
  profileInputSchema,
  profileUpdateSchema,
} from "@/lib/validation/profiles";
import { fail, ok, type ActionState } from "./result";

/** First-run only: creates the first (admin) profile and selects it. */
export async function createFirstProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isDeviceUnlocked())) redirect("/unlock");
  try {
    const created = await profiles.createFirstProfile(profileInputSchema.parse(formToObject(formData)));
    await setCurrentProfile(created.id);
  } catch (e) {
    return fail(e);
  }
  redirect("/today");
}

export async function createProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const created = await profiles.createProfile(actor, createProfileSchema.parse(formToObject(formData)));
    revalidatePath("/", "layout");
    return ok(undefined, `Added ${created.name}.`);
  } catch (e) {
    return fail(e);
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const updated = await profiles.updateProfile(actor, profileUpdateSchema.parse(formToObject(formData)));
    revalidatePath("/", "layout");
    return ok(undefined, `Saved ${updated.name}.`);
  } catch (e) {
    return fail(e);
  }
}

export async function archiveProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await profiles.archiveProfile(actor, profileIdSchema.parse(formToObject(formData)).id);
    revalidatePath("/", "layout");
    return ok(undefined, "Profile archived.");
  } catch (e) {
    return fail(e);
  }
}

export async function restoreProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await profiles.restoreProfile(actor, profileIdSchema.parse(formToObject(formData)).id);
    revalidatePath("/", "layout");
    return ok(undefined, "Profile restored.");
  } catch (e) {
    return fail(e);
  }
}
