import { BackLink } from "@/components/shell/back-link";
import { PageHeader } from "@/components/shell/page-header";
import { InstallGuide } from "@/components/pwa/install-guide";
import { requireProfile } from "@/lib/services/session";

export default async function InstallPage() {
  await requireProfile();
  return (
    <>
      <BackLink href="/more">More</BackLink>
      <PageHeader
        title="Install on your phone"
        showProfile={false}
        subtitle="Installing puts Gharkaam on your home screen as a full-screen app. On iPhone it's also required for notifications."
      />
      <InstallGuide />
    </>
  );
}
