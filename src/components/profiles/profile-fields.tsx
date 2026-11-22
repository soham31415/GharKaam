import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Profile } from "@/lib/types";

/** Shared name/avatar(/admin) inputs for the profile forms. */
export function ProfileFields({
  profile,
  idPrefix,
  showAdmin,
}: {
  profile?: Profile;
  idPrefix: string;
  showAdmin?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`}>Name</Label>
        <Input id={`${idPrefix}-name`} name="name" defaultValue={profile?.name} required maxLength={40} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-avatar`}>Emoji (optional)</Label>
        <Input id={`${idPrefix}-avatar`} name="avatar" defaultValue={profile?.avatar ?? ""} maxLength={8} />
      </div>
      {showAdmin ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isAdmin" defaultChecked={profile?.isAdmin} />
          Admin (can manage profiles and settings)
        </label>
      ) : null}
    </>
  );
}
