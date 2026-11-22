"use client";

import { useActionState, useEffect, useRef } from "react";
import { createProfileAction } from "@/actions/profiles";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { ProfileFields } from "./profile-fields";

export function AddProfileForm() {
  const [state, action] = useActionState(createProfileAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <ProfileFields idPrefix="new" showAdmin />
      <FormMessage state={state} />
      <SubmitButton pendingText="Adding…">Add profile</SubmitButton>
    </form>
  );
}
