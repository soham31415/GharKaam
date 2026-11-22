import { redirect } from "next/navigation";
import { FirstProfileForm } from "@/components/profiles/first-profile-form";
import { ProfilePicker } from "@/components/profiles/profile-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfilePickerData } from "@/lib/services/profiles";
import { getCurrentProfile, isDeviceUnlocked } from "@/lib/services/session";

export default async function ProfilesPage() {
  if (!(await isDeviceUnlocked())) redirect("/unlock");
  const [{ profiles, isFirstRun }, current] = await Promise.all([getProfilePickerData(), getCurrentProfile()]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 p-4">
      {isFirstRun ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Gharkaam</CardTitle>
            <CardDescription>
              No profiles yet. Create yours first. It will be an admin profile, so you can add the rest of the family
              from Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FirstProfileForm />
          </CardContent>
        </Card>
      ) : (
        <>
          <h1 className="text-xl font-semibold">Who&apos;s using Gharkaam?</h1>
          <ProfilePicker profiles={profiles} currentId={current?.id} />
          <p className="text-sm text-muted-foreground">Not listed? Ask an admin to add you in Settings → Profiles.</p>
        </>
      )}
    </main>
  );
}
