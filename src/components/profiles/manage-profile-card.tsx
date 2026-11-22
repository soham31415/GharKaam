"use client";

import { useActionState } from "react";
import { archiveProfileAction, restoreProfileAction, updateProfileAction } from "@/actions/profiles";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/types";
import { ProfileFields } from "./profile-fields";

export function ManageProfileCard({ profile, isMe }: { profile: Profile; isMe: boolean }) {
  const [saveState, save] = useActionState(updateProfileAction, null);
  const [archiveState, archive] = useActionState(archiveProfileAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {profile.avatar} {profile.name}
          {profile.isAdmin ? <Badge variant="secondary">admin</Badge> : null}
          {isMe ? <Badge variant="outline">you</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form action={save} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={profile.id} />
          <ProfileFields profile={profile} idPrefix={profile.id} showAdmin />
          <FormMessage state={saveState} />
          <SubmitButton variant="outline" pendingText="Saving…">
            Save
          </SubmitButton>
        </form>
        {!isMe ? (
          <form action={archive} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={profile.id} />
            <FormMessage state={archiveState} />
            <SubmitButton variant="destructive" pendingText="Archiving…">
              Archive profile
            </SubmitButton>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ArchivedProfileRow({ profile }: { profile: Profile }) {
  const [state, restore] = useActionState(restoreProfileAction, null);
  return (
    <form action={restore} className="flex items-center justify-between gap-2">
      <input type="hidden" name="id" value={profile.id} />
      <span>
        {profile.avatar} {profile.name}
      </span>
      <FormMessage state={state} />
      <SubmitButton variant="outline" size="sm" pendingText="Restoring…">
        Restore
      </SubmitButton>
    </form>
  );
}
