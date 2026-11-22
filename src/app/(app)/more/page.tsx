import { ChevronRight, Clock, Download, Settings, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { GroupCard } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { requireProfile } from "@/lib/services/session";

const LINKS: { href: string; label: string; sub: string; icon: LucideIcon }[] = [
  { href: "/history", label: "History", sub: "Who did what, and undo", icon: Clock },
  { href: "/settings", label: "Settings", sub: "Profile, family, this device", icon: Settings },
  { href: "/settings/install", label: "Install on your phone", sub: "Full-screen app and notifications", icon: Download },
];

export default async function MorePage() {
  await requireProfile();
  return (
    <>
      <PageHeader title="More" />
      <GroupCard>
        {LINKS.map(({ href, label, sub, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 px-4 py-3 active:bg-muted">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-tint text-primary">
              <Icon aria-hidden="true" className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base font-semibold">{label}</span>
              <span className="text-[13px] text-muted-foreground">{sub}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-chevron" strokeWidth={2.6} />
          </Link>
        ))}
      </GroupCard>
    </>
  );
}
