"use client";

import { useActionState } from "react";
import { archiveChoreAction, restoreChoreAction } from "@/actions/chores";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";

export function ArchiveChoreButton({ choreId, archived }: { choreId: string; archived: boolean }) {
  const [state, action] = useActionState(archived ? restoreChoreAction : archiveChoreAction, null);
  return (
    <form action={action} className="flex flex-col gap-1">
      <input type="hidden" name="id" value={choreId} />
      <SubmitButton variant={archived ? "outline" : "destructive"} pendingText="…">
        {archived ? "Restore chore" : "Archive chore"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
