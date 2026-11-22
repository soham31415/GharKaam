import { cn } from "cn";
import { selectProfileAction } from "@/actions/session";
import { Avatar } from "@/components/people/avatar";
import type { Profile } from "@/lib/types";

/** Netflix-style grid of profiles; tapping one selects it on this device. */
export function ProfilePicker({ profiles, currentId }: { profiles: Profile[]; currentId?: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {profiles.map((p) => (
        <li key={p.id}>
          <form action={selectProfileAction}>
            <input type="hidden" name="id" value={p.id} />
            <button
              type="submit"
              aria-label={`Continue as ${p.name}`}
              className={cn(
                "pressable flex w-full flex-col items-center gap-2 rounded-card bg-card px-3 pt-5 pb-4 text-[17px] font-semibold",
                p.id === currentId && "ring-2 ring-primary",
              )}
            >
              <Avatar person={p} size="xl" />
              {p.name}
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
