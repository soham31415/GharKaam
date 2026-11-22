import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { NewChoreSheet } from "@/components/chores/new-chore-sheet";
import { SegmentedLinks } from "@/components/form/controls";
import { HappyHouse } from "@/components/illustrations";
import { AnyoneAvatar, Avatar } from "@/components/people/avatar";
import { EmptyState, GroupCard, Section } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { listChores } from "@/lib/services/chores";
import { today as todayIn } from "@/lib/services/clock";
import { requireProfile } from "@/lib/services/session";
import type { ChoreSummary } from "@/lib/types";
import { choreBadge, dateTile, groupChores, whoText } from "@/lib/view/chores";

const TABS = [
  { value: "all", label: "All", href: "/chores" },
  { value: "mine", label: "Mine", href: "/chores?filter=mine" },
  { value: "archived", label: "Archived", href: "/chores?filter=archived" },
];

const EMPTY = {
  all: { title: "No chores yet", text: "Tap New to add the first one." },
  mine: { title: "Nothing assigned to you", text: "Chores you do or take turns on show up here." },
  archived: { title: "No archived chores", text: "Chores an admin archives will rest here." },
};

const TILE = {
  danger: "bg-danger text-danger-foreground",
  soon: "bg-soon text-soon-foreground",
  neutral: "bg-neutral text-[#3A3A3C] dark:text-[#E5E5EA]",
};

export default async function ChoresPage({ searchParams }: PageProps<"/chores">) {
  const me = await requireProfile();
  const { filter } = await searchParams;
  const tab = filter === "mine" || filter === "archived" ? filter : "all";
  const t = todayIn();
  const chores = await listChores(me, { filter: tab === "mine" ? "mine" : "all", archived: tab === "archived" });
  const groups = groupChores(chores, t);

  return (
    <>
      <PageHeader title="Chores" trailing={<NewChoreSheet today={t} />} />
      <div className="-mt-1.5">
        <SegmentedLinks label="Filter chores" value={tab} options={TABS} />
      </div>

      {groups.length === 0 ? (
        <EmptyState art={<HappyHouse />} title={EMPTY[tab].title}>
          {EMPTY[tab].text}
        </EmptyState>
      ) : (
        groups.map((g) => (
          <Section
            key={g.key}
            label={`${g.label} · ${g.chores.length}`}
            labelClassName={g.key === "overdue" ? "text-danger-foreground dark:text-destructive" : undefined}
            className="-mt-1.5 gap-1.5"
          >
            <GroupCard>
              {g.chores.map((c) => (
                <ChoreRow key={c.id} chore={c} today={t} />
              ))}
            </GroupCard>
          </Section>
        ))
      )}
    </>
  );
}

function ChoreRow({ chore, today }: { chore: ChoreSummary; today: string }) {
  const tile = dateTile(chore.next?.dueDate ?? null, today);
  const badge = choreBadge(chore);
  return (
    <Link href={`/chores/${chore.id}`} className="flex items-center gap-3 px-3 py-[11px] active:bg-muted">
      <span className={cn("flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-tile", TILE[tile.tone])}>
        {tile.top ? <span className="text-[10.5px] font-bold tracking-[0.4px]">{tile.top}</span> : null}
        <span className="font-heading text-[21px] leading-[1.05] font-black">{tile.day}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[16.5px] font-semibold">{chore.title}</span>
          {badge ? (
            <span
              className={cn(
                "shrink-0 rounded-[7px] px-[7px] py-px text-[11.5px] font-bold",
                badge.tone === "danger" ? "bg-danger text-danger-foreground" : "bg-neutral text-neutral-foreground",
              )}
            >
              {badge.text}
            </span>
          ) : null}
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{chore.scheduleText}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-secondary-foreground">
          <span className="inline-flex -space-x-[5px]">
            {chore.people.length === 0 ? <AnyoneAvatar ring /> : chore.people.map((p) => <Avatar key={p.id} person={p} ring />)}
          </span>
          <span className="ml-1 truncate">{whoText(chore)}</span>
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-[15px] shrink-0 text-chevron" strokeWidth={2.6} />
    </Link>
  );
}
