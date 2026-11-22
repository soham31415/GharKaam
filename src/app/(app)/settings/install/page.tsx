import Link from "next/link";
import { InstallGuide } from "@/components/pwa/install-guide";
import { requireProfile } from "@/lib/services/session";

export default async function InstallPage() {
  await requireProfile();
  return (
    <>
      <Link href="/settings" className="text-sm underline-offset-4 hover:underline">
        ← Settings
      </Link>
      <h1 className="text-xl font-semibold">Install on your phone</h1>
      <p className="text-sm text-muted-foreground">
        Installing puts Gharkaam on your home screen as a full-screen app. On iPhone it&apos;s also required for
        notifications.
      </p>
      <InstallGuide />
    </>
  );
}
