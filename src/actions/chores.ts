"use server";

import { redirect } from "next/navigation";
import { formatDate } from "@/lib/domain/dates";
import { today } from "@/lib/services/clock";
import * as chores from "@/lib/services/chores";
import { requireProfile } from "@/lib/services/session";
import {
  choreIdSchema,
  choreInputSchema,
  closeOccurrenceSchema,
  moveSchema,
  occurrenceIdSchema,
  reassignSchema,
} from "@/lib/validation/chores";
import { formToObject } from "@/lib/validation/form";
import { refreshAll } from "./refresh";
import { fail, ok, type ActionState } from "./result";

export async function createChoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id: string;
  try {
    const actor = await requireProfile();
    ({ id } = await chores.createChore(actor, choreInputSchema.parse(formToObject(formData))));
  } catch (e) {
    return fail(e);
  }
  refreshAll();
  redirect(`/chores/${id}`);
}

export async function updateChoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const { id } = choreIdSchema.parse({ id: formData.get("id") });
    await chores.updateChore(actor, id, choreInputSchema.parse(formToObject(formData)));
    refreshAll();
    return ok(undefined, "Saved.");
  } catch (e) {
    return fail(e);
  }
}

export async function archiveChoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await chores.archiveChore(actor, choreIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Chore archived.");
  } catch (e) {
    return fail(e);
  }
}

export async function restoreChoreAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await chores.restoreChore(actor, choreIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Chore restored.");
  } catch (e) {
    return fail(e);
  }
}

export async function closeOccurrenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = closeOccurrenceSchema.parse(formToObject(formData));
    const { nextDue } = await chores.closeOccurrence(actor, input.id, input.status);
    refreshAll();
    const verb = input.status === "done" ? "Done" : "Skipped";
    return ok(undefined, nextDue ? `${verb}. Next: ${formatDate(nextDue, today())}.` : `${verb}.`);
  } catch (e) {
    return fail(e);
  }
}

export async function undoOccurrenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await chores.undoOccurrence(actor, occurrenceIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Undone. It's open again.");
  } catch (e) {
    return fail(e);
  }
}

export async function reassignOccurrenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = reassignSchema.parse(formToObject(formData));
    await chores.reassignOccurrence(actor, input.id, input.assigneeId);
    refreshAll();
    return ok(undefined, "Reassigned.");
  } catch (e) {
    return fail(e);
  }
}

export async function moveOccurrenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = moveSchema.parse(formToObject(formData));
    await chores.moveOccurrence(actor, input.id, input.dueDate);
    refreshAll();
    return ok(undefined, `Moved to ${formatDate(input.dueDate, today())}.`);
  } catch (e) {
    return fail(e);
  }
}
