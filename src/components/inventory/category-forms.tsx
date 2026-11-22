"use client";

import { useActionState } from "react";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/actions/inventory";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/types";

export function AddCategoryForm() {
  const [state, action] = useActionState(createCategoryAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Name
          <Input name="name" required maxLength={40} />
        </label>
        <SubmitButton pendingText="Adding…">Add category</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CategoryRow({ category }: { category: Category }) {
  const [saveState, save] = useActionState(updateCategoryAction, null);
  const [deleteState, remove] = useActionState(deleteCategoryAction, null);
  return (
    <li className="flex flex-col gap-2 border-b py-3">
      <form action={save} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={category.id} />
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Name
          <Input name="name" defaultValue={category.name} key={category.name} required maxLength={40} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Order
          <Input name="sortOrder" type="number" min={0} max={10000} defaultValue={category.sortOrder} key={category.sortOrder} className="w-20" />
        </label>
        <SubmitButton variant="outline" pendingText="Saving…">
          Save
        </SubmitButton>
      </form>
      <form action={remove} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={category.id} />
        <span className="text-sm text-muted-foreground">
          {category.itemCount === 0
            ? "No items"
            : `${category.itemCount} item${category.itemCount === 1 ? "" : "s"} (they become uncategorised if you delete it)`}
        </span>
        <SubmitButton variant="ghost" size="sm" pendingText="Deleting…">
          Delete
        </SubmitButton>
      </form>
      <FormMessage state={saveState} />
      <FormMessage state={deleteState} />
    </li>
  );
}
