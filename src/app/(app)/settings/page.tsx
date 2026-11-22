import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { lockDeviceAction, switchProfileAction } from "@/actions/session";
import { Avatar } from "@/components/people/avatar";
import { InstallStatus } from "@/components/pwa/install-guide";
import { BackLink } from "@/components/shell/back-link";
import { GroupCard, Section } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/services/session";

function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-base active:bg-muted">
      {children}
      <ChevronRight aria-hidden="true" className="size-4 text-chevron" strokeWidth={2.6} />
    </Link>
  );
}

export default async function SettingsPage() {
  const me = await requireProfile();
  return (
    <>
      <BackLink href="/more">More</BackLink>
      <PageHeader title="Settings" showProfile={false} />

      <Section label="Profile">
        <GroupCard>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Avatar person={me} size="lg" />
            <div className="flex flex-col">
              <span className="text-[17px] font-semibold">{me.name}</span>
              <span className="text-[13px] text-muted-foreground">{me.isAdmin ? "Admin profile" : "Member profile"}</span>
            </div>
          </div>
          <form action={switchProfileAction} className="px-4 py-2.5">
            <SubmitButton variant="secondary" className="w-full">
              Switch profile
            </SubmitButton>
          </form>
          {me.isAdmin ? <LinkRow href="/settings/profiles">Manage profiles</LinkRow> : null}
          {me.isAdmin ? <LinkRow href="/settings/categories">Shopping categories</LinkRow> : null}
        </GroupCard>
      </Section>

      <Section label="App">
        <GroupCard>
          <div className="px-4 py-3">
            <InstallStatus />
          </div>
          <LinkRow href="/settings/install">Install on your phone</LinkRow>
        </GroupCard>
      </Section>

      <Section label="This device" footer="Locking asks for the family passcode again on this device only.">
        <GroupCard>
          <form action={lockDeviceAction} className="px-4 py-2.5">
            <SubmitButton variant="destructive" className="w-full">
              Lock this device
            </SubmitButton>
          </form>
        </GroupCard>
      </Section>
    </>
  );
}
