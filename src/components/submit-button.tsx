"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Base UI's Button defaults to type="button", so form submits need this. */
export function SubmitButton({
  children,
  pendingText,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type"> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
