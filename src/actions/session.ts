"use server";

import { redirect } from "next/navigation";
import * as session from "@/lib/services/session";
import { formToObject, uuid } from "@/lib/validation/form";
import { safeNextPath, unlockSchema } from "@/lib/validation/session";
import { fail, type ActionState } from "./result";

export async function unlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let next: string;
  try {
    const input = unlockSchema.parse(formToObject(formData));
    if (!(await session.unlockDevice(input.passcode))) {
      // Slow down guessing a little.
      await new Promise((r) => setTimeout(r, 800));
      return { ok: false, error: "Wrong passcode." };
    }
    next = safeNextPath(input.next);
  } catch (e) {
    return fail(e);
  }
  redirect(next);
}

export async function selectProfileAction(formData: FormData): Promise<void> {
  const id = uuid.parse(formData.get("id"));
  await session.setCurrentProfile(id);
  redirect("/today");
}

export async function switchProfileAction(): Promise<void> {
  await session.clearCurrentProfile();
  redirect("/profiles");
}

export async function lockDeviceAction(): Promise<void> {
  await session.lockDevice();
  redirect("/unlock");
}
