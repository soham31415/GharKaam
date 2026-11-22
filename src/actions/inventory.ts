"use server";

import { formatDate } from "@/lib/domain/dates";
import { today } from "@/lib/services/clock";
import * as inventory from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import { formToObject } from "@/lib/validation/form";
import {
  categoryIdSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  itemIdSchema,
  itemInputSchema,
  markBoughtSchema,
  quickAddSchema,
  setLowSchema,
} from "@/lib/validation/inventory";
import { refreshAll } from "./refresh";
import { fail, ok, type ActionState } from "./result";

// ── Items ───────────────────────────────────────────────────────────────────

export async function createItemAction(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const actor = await requireProfile();
    const { id, name } = await inventory.createItem(actor, itemInputSchema.parse(formToObject(formData)));
    refreshAll();
    return ok({ id }, `Added ${name}.`);
  } catch (e) {
    return fail(e);
  }
}

export async function updateItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const { id } = itemIdSchema.parse({ id: formData.get("id") });
    await inventory.updateItem(actor, id, itemInputSchema.parse(formToObject(formData)));
    refreshAll();
    return ok(undefined, "Saved.");
  } catch (e) {
    return fail(e);
  }
}

export async function archiveItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await inventory.archiveItem(actor, itemIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Item archived.");
  } catch (e) {
    return fail(e);
  }
}

export async function restoreItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await inventory.restoreItem(actor, itemIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Item restored.");
  } catch (e) {
    return fail(e);
  }
}

export async function setLowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = setLowSchema.parse(formToObject(formData));
    await inventory.setLow(actor, input.id, input.low);
    refreshAll();
    return ok(undefined, input.low ? "Marked running low. It's on the shopping list." : "No longer running low.");
  } catch (e) {
    return fail(e);
  }
}

export async function markBoughtAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = markBoughtSchema.parse(formToObject(formData));
    const { bought, skipped } = await inventory.markBought(actor, input.ids, input);
    refreshAll();
    const parts: string[] = [];
    if (bought.length > 0) parts.push(`Bought: ${bought.join(", ")}.`);
    if (skipped.length > 0) parts.push(`Already bought by someone else: ${skipped.join(", ")}.`);
    return ok(undefined, parts.join(" ") || "Nothing to mark.");
  } catch (e) {
    return fail(e);
  }
}

export async function notNeededAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const { nextDue } = await inventory.notNeeded(actor, itemIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, nextDue ? `Removed. Next due ${formatDate(nextDue, today())}.` : "Removed from the list.");
  } catch (e) {
    return fail(e);
  }
}

export async function quickAddAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const { name, result } = await inventory.quickAdd(actor, quickAddSchema.parse(formToObject(formData)));
    refreshAll();
    const message = {
      added: `Added ${name} to the list.`,
      flagged: `${name} is in the inventory: marked running low.`,
      already_on_list: `${name} is already on the list.`,
    }[result];
    return ok(undefined, message);
  } catch (e) {
    return fail(e);
  }
}

// ── Categories ──────────────────────────────────────────────────────────────

export async function createCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await inventory.createCategory(actor, categoryInputSchema.parse(formToObject(formData)));
    refreshAll();
    return ok(undefined, "Category added.");
  } catch (e) {
    return fail(e);
  }
}

export async function updateCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    const input = categoryUpdateSchema.parse(formToObject(formData));
    await inventory.updateCategory(actor, input.id, input);
    refreshAll();
    return ok(undefined, "Saved.");
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCategoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const actor = await requireProfile();
    await inventory.deleteCategory(actor, categoryIdSchema.parse(formToObject(formData)).id);
    refreshAll();
    return ok(undefined, "Category deleted.");
  } catch (e) {
    return fail(e);
  }
}
