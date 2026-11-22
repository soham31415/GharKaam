"use client";

import { useActionState } from "react";
import { unlockAction } from "@/actions/session";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnlockForm({ next }: { next?: string }) {
  const [state, action] = useActionState(unlockAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="passcode">Family passcode</Label>
        <Input id="passcode" name="passcode" type="password" autoComplete="current-password" required autoFocus />
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingText="Checking…">Unlock</SubmitButton>
    </form>
  );
}
