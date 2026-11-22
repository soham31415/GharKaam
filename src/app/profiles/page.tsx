import { redirect } from "next/navigation";
import { AppMark } from "@/components/illustrations";
import { SessionProvider } from "@/components/people/session-context";
import { FirstProfileForm } from "@/components/profiles/first-profile-form";
import { ProfilePicker } from "@/components/profiles/profile-picker";
import { getProfilePickerData } from "@/lib/services/profiles";
import { getCurrentProfile, isDeviceUnlocked } from "@/lib/services/session";

export default async function ProfilesPage() {
  if (!(await isDeviceUnlocked())) redirect("/unlock");
  const [{ profiles, isFirstRun }, current] = await Promise.all([getProfilePickerData(), getCurrentProfile()]);

  return (
    <SessionProvider me={current} people={profiles}>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <AppMark size={64} className="self-center" />
        {isFirstRun ? (
          <>
            <div className="flex flex-col gap-1.5 text-center">
              <h1 className="font-heading text-[30px] leading-tight font-black">Welcome to Gharkaam</h1>
              <p className="text-[15px] leading-snug text-muted-foreground">
                No profiles yet. Create yours first. It will be an admin profile, so you can add the rest of the family
                from Settings.
              </p>
            </div>
            <div className="rounded-card bg-card p-4">
              <FirstProfileForm />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-center font-heading text-[30px] leading-tight font-black">Who&apos;s using Gharkaam?</h1>
            <ProfilePicker profiles={profiles} currentId={current?.id} />
            <p className="text-center text-[13px] text-muted-foreground">
              Not listed? Ask an admin to add you in Settings → Profiles.
            </p>
          </>
        )}
      </main>
    </SessionProvider>
  );
}
