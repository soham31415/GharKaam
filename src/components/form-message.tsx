import type { ActionState } from "@/actions/result";

/** Shows the result of a form's server action. */
export function FormMessage({ state }: { state: ActionState<unknown> }) {
  if (!state) return null;
  if (state.ok) {
    return state.message ? (
      <p role="status" className="text-sm text-muted-foreground">
        {state.message}
      </p>
    ) : null;
  }
  return (
    <p role="alert" className="text-sm text-destructive">
      {state.error}
    </p>
  );
}
