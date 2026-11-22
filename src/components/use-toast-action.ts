"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/actions/result";

type Action<T> = (prev: ActionState<T>, formData: FormData) => Promise<ActionState<T>>;

export type Fields = Record<string, string | string[]>;

function toFormData(fields: Fields): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const v of Array.isArray(value) ? value : [value]) fd.append(key, v);
  }
  return fd;
}

/**
 * Calls a server action outside a <form>. Network failures (offline, server
 * unreachable) come back as an error result instead of throwing; real bugs
 * still show up in the server logs.
 */
export async function callAction<T>(action: Action<T>, fields: Fields): Promise<ActionState<T>> {
  try {
    return await action(null, toFormData(fields));
  } catch {
    return {
      ok: false,
      error: navigator.onLine ? "Couldn't reach the server. Try again." : "You're offline. Try again when connected.",
    };
  }
}

/**
 * Calls a server action outside a <form> and reports the result as a toast.
 * Used where the button's row may disappear after the change (e.g. an item
 * leaving the shopping list), so an inline message would be lost.
 */
export function useToastAction<T = undefined>(action: Action<T>) {
  const [pending, start] = useTransition();
  const run = (fields: Fields, opts: { prefix?: string; onOk?: (data: T) => void; onError?: () => void } = {}) =>
    start(async () => {
      const res = await callAction(action, fields);
      if (res?.ok) {
        if (res.message) toast.success(opts.prefix ? `${opts.prefix}: ${res.message}` : res.message);
        opts.onOk?.(res.data);
      } else if (res) {
        toast.error(res.error);
        opts.onError?.();
      }
    });
  return [pending, run] as const;
}
