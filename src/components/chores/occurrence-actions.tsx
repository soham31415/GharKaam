"use client";

import { ChevronDown } from "lucide-react";
import { useActionState } from "react";
import {
  closeOccurrenceAction,
  moveOccurrenceAction,
  reassignOccurrenceAction,
  undoOccurrenceAction,
} from "@/actions/chores";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { useToastAction } from "@/components/use-toast-action";
import type { PersonRef } from "@/lib/types";

/**
 * Done / Skip buttons for an open task. Results are shown as toasts because
 * the task (and this component) disappears once it's closed.
 */
export function DoneSkipButtons({ occurrenceId, title }: { occurrenceId: string; title: string }) {
  const [pending, run] = useToastAction(closeOccurrenceAction);
  return (
    <div className="flex gap-2">
      <Button className="flex-1" onClick={() => run({ id: occurrenceId, status: "done" }, { prefix: title })} disabled={pending}>
        Done
      </Button>
      <Button
        variant="secondary"
        className="px-5"
        onClick={() => run({ id: occurrenceId, status: "skipped" }, { prefix: title })}
        disabled={pending}
      >
        Skip
      </Button>
    </div>
  );
}

export function UndoButton({ occurrenceId, title }: { occurrenceId: string; title: string }) {
  const [pending, run] = useToastAction(undoOccurrenceAction);
  return (
    <button
      type="button"
      onClick={() => run({ id: occurrenceId }, { prefix: title })}
      disabled={pending}
      className="pressable h-9 shrink-0 rounded-full bg-primary-tint px-3.5 text-sm font-semibold text-primary disabled:opacity-60"
    >
      {pending ? "Undoing…" : "Undo"}
    </button>
  );
}

const pill =
  "h-9 appearance-none rounded-pill bg-neutral pr-7 pl-2.5 text-[15px] font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/40";

/** Hand this one task to someone else, or move its date. Rows for a GroupCard. */
export function ReassignMoveForms({
  occurrenceId,
  assigneeId,
  dueDate,
  people,
}: {
  occurrenceId: string;
  assigneeId: string | null;
  dueDate: string;
  people: PersonRef[];
}) {
  const [reassignState, reassign] = useActionState(reassignOccurrenceAction, null);
  const [moveState, move] = useActionState(moveOccurrenceAction, null);
  return (
    <>
      <form action={reassign} className="flex flex-col gap-1 px-4 py-2.5">
        <input type="hidden" name="id" value={occurrenceId} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-base">
            <span className="flex-1">This time, give it to</span>
            <span className="relative inline-flex">
              <select name="assigneeId" defaultValue={assigneeId ?? ""} key={assigneeId ?? "anyone"} className={pill}>
                <option value="">Anyone</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={3} />
            </span>
          </label>
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            Reassign
          </SubmitButton>
        </div>
        <FormMessage state={reassignState} />
      </form>
      <form action={move} className="flex flex-col gap-1 px-4 py-2.5">
        <input type="hidden" name="id" value={occurrenceId} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex flex-1 items-center gap-2 text-base">
            <span className="flex-1">Move this one to</span>
            <input
              type="date"
              name="dueDate"
              defaultValue={dueDate}
              key={dueDate}
              required
              className="h-9 rounded-pill bg-neutral px-2.5 text-[15px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
            />
          </label>
          <SubmitButton size="sm" variant="outline" pendingText="Moving…">
            Move
          </SubmitButton>
        </div>
        <FormMessage state={moveState} />
      </form>
    </>
  );
}
