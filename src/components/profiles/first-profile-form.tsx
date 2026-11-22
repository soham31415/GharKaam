"use client";

import { useActionState } from "react";
import { createFirstProfileAction } from "@/actions/profiles";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { ProfileFields } from "./profile-fields";

export function FirstProfileForm() {
  const [state, action] = useActionState(createFirstProfileAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <ProfileFields idPrefix="first" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…">Create my profile</SubmitButton>
    </form>
  );
}
