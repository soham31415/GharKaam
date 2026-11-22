"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import {
  closeOccurrenceAction,
  moveOccurrenceAction,
  reassignOccurrenceAction,
  undoOccurrenceAction,
} from "@/actions/chores";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { PersonRef } from "@/lib/types";

/**
 * Done / Skip buttons for an open task. Results are shown as toasts because
 * the task (and this component) disappears from the list once it's closed.
 */
export function DoneSkipButtons({ occurrenceId, title }: { occurrenceId: string; title: string }) {
  const [pending, start] = useTransition();
  const run = (status: "done" | "skipped") =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", occurrenceId);
      fd.set("status", status);
      const res = await closeOccurrenceAction(null, fd);
      if (res?.ok) toast.success(`${title}: ${res.message}`);
      else if (res) toast.error(res.error);
    });
  return (
    <div className="flex gap-2">
      <Button onClick={() => run("done")} disabled={pending}>
        Done
      </Button>
      <Button variant="outline" onClick={() => run("skipped")} disabled={pending}>
        Skip
      </Button>
    </div>
  );
}

export function UndoButton({ occurrenceId, title }: { occurrenceId: string; title: string }) {
  const [pending, start] = useTransition();
  const undo = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", occurrenceId);
      const res = await undoOccurrenceAction(null, fd);
      if (res?.ok) toast.success(`${title}: undone. It's open again.`);
      else if (res) toast.error(res.error);
    });
  return (
    <div>
      <Button variant="outline" size="sm" onClick={undo} disabled={pending}>
        {pending ? "Undoing…" : "Undo"}
      </Button>
    </div>
  );
}

/** Hand this one task to someone else, or move its date. */
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
    <div className="flex flex-col gap-3">
      <form action={reassign} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={occurrenceId} />
        <label className="flex flex-col gap-1 text-sm">
          This time, give it to
          <NativeSelect name="assigneeId" defaultValue={assigneeId ?? ""} key={assigneeId ?? "anyone"}>
            <NativeSelectOption value="">Anyone</NativeSelectOption>
            {people.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <SubmitButton variant="outline" pendingText="Saving…">
          Reassign
        </SubmitButton>
        <FormMessage state={reassignState} />
      </form>
      <form action={move} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={occurrenceId} />
        <label className="flex flex-col gap-1 text-sm">
          Move this one to
          <Input type="date" name="dueDate" defaultValue={dueDate} key={dueDate} required className="w-auto" />
        </label>
        <SubmitButton variant="outline" pendingText="Moving…">
          Move
        </SubmitButton>
        <FormMessage state={moveState} />
      </form>
    </div>
  );
}
