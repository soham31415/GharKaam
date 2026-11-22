"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/actions/result";

type Action<T> = (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;

/**
 * Calls a server action outside a <form> and reports the result as a toast.
 * Used where the button's row may disappear after the change (e.g. an item
 * leaving the shopping list), so an inline message would be lost.
 */
export function useToastAction<T = undefined>(action: Action<T>) {
  const [pending, start] = useTransition();
  const run = (
    fields: Record<string, string | string[]>,
    opts: { prefix?: string; onOk?: (data: T) => void } = {},
  ) =>
    start(async () => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
      }
      const res = await action(null, fd);
      if (res?.ok) {
        if (res.message) toast.success(opts.prefix ? `${opts.prefix}: ${res.message}` : res.message);
        opts.onOk?.(res.data);
      } else if (res) {
        toast.error(res.error);
      }
    });
  return [pending, run] as const;
}
