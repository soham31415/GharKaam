import { selectProfileAction } from "@/actions/session";
import { SubmitButton } from "@/components/submit-button";
import type { Profile } from "@/lib/types";

/** Netflix-style list of profiles; tapping one selects it on this device. */
export function ProfilePicker({ profiles, currentId }: { profiles: Profile[]; currentId?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {profiles.map((p) => (
        <li key={p.id}>
          <form action={selectProfileAction}>
            <input type="hidden" name="id" value={p.id} />
            <SubmitButton
              variant={p.id === currentId ? "default" : "outline"}
              className="h-20 w-full flex-col"
              aria-label={`Continue as ${p.name}`}
            >
              {p.avatar ? <span className="text-2xl">{p.avatar}</span> : null}
              <span>{p.name}</span>
            </SubmitButton>
          </form>
        </li>
      ))}
    </ul>
  );
}
