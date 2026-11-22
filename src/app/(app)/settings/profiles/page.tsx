import { BackLink } from "@/components/shell/back-link";
import { PageHeader } from "@/components/shell/page-header";
import Link from "next/link";
import { AddProfileForm } from "@/components/profiles/add-profile-form";
import { ArchivedProfileRow, ManageProfileCard } from "@/components/profiles/manage-profile-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listProfilesForManagement } from "@/lib/services/profiles";
import { requireProfile } from "@/lib/services/session";

export default async function ManageProfilesPage() {
  const me = await requireProfile();
  if (!me.isAdmin) {
    return (
      <>
        <h1 className="text-xl font-semibold">Profiles</h1>
        <p className="text-muted-foreground">Only admin profiles can manage profiles.</p>
        <Link href="/settings" className="underline">
          Back to settings
        </Link>
      </>
    );
  }

  const { active, archived } = await listProfilesForManagement();
  return (
    <>
      <BackLink href="/settings">Settings</BackLink>
      <PageHeader title="Profiles" showProfile={false} />

      <Card>
        <CardHeader>
          <CardTitle>Add a family member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddProfileForm />
        </CardContent>
      </Card>

      {active.map((p) => (
        <ManageProfileCard key={p.id} profile={p} isMe={p.id === me.id} />
      ))}

      {archived.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Archived</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {archived.map((p) => (
              <ArchivedProfileRow key={p.id} profile={p} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
