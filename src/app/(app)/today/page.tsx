import { ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { NewChoreSheet } from "@/components/chores/new-chore-sheet";
import { PersonTag } from "@/components/people/avatar";
import { InstallHint } from "@/components/pwa/install-guide";
import { GroupCard, Section } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { TaskList } from "@/components/today/task-list";
import { getTodayView } from "@/lib/services/chores";
import { getShoppingList } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import { longDateLabel, shoppingSummary, todaySummary } from "@/lib/view/today";

export default async function TodayPage() {
  const me = await requireProfile();
  const [view, shopping] = await Promise.all([getTodayView(me), getShoppingList()]);
  const open = [...view.mine, ...view.anyone, ...view.others];

  return (
    <>
      <PageHeader
        eyebrow={longDateLabel(view.today).toUpperCase()}
        actions={<NewChoreSheet today={view.today} trigger="icon" />}
        title="Today"
        subtitle={todaySummary(open)}
      />

      <InstallHint />

      {shopping.count > 0 ? (
        <Link href="/shopping" className="pressable flex items-center gap-3 rounded-card bg-card px-3.5 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-primary-tint text-primary">
            <ShoppingCart aria-hidden="true" className="size-[22px]" strokeWidth={2} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-base font-semibold">Shopping list</span>
            <span className="truncate text-[13px] text-muted-foreground">{shoppingSummary(shopping)}</span>
          </span>
          <span className="text-[15px] font-bold text-primary tabular-nums">{shopping.count}</span>
          <ChevronRight aria-hidden="true" className="size-4 text-tertiary" strokeWidth={2.4} />
        </Link>
      ) : null}

      <TaskList mine={view.mine} anyone={view.anyone} others={view.others} />

      <Section
        label="Coming up tomorrow"
        footer={
          open.length > 0
            ? "Tip: tap the circle to finish. On a phone you can also swipe a row right for Done or left for Skip."
            : undefined
        }
      >
        <GroupCard>
          {view.tomorrow.length === 0 ? (
            <TomorrowRow title="Nothing due tomorrow. Enjoy the break." />
          ) : (
            view.tomorrow.map((occ) => (
              <TomorrowRow
                key={occ.id}
                title={occ.choreTitle}
                href={`/chores/${occ.choreId}`}
                who={occ.assignee ? <PersonTag person={occ.assignee} /> : <span className="text-[13px] text-secondary-foreground">Anyone</span>}
              />
            ))
          )}
        </GroupCard>
      </Section>
    </>
  );
}

function TomorrowRow({ title, href, who }: { title: string; href?: string; who?: React.ReactNode }) {
  const body = (
    <>
      <span aria-hidden="true" className="size-[26px] shrink-0 rounded-full border-2 border-dashed border-[#C7C7CC] dark:border-[#48484A]" />
      <span className="min-w-0 flex-1 text-base text-[#3A3A3C] dark:text-[#D1D1D6]">{title}</span>
      {who}
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-3 px-4 py-3">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-4 py-3">{body}</div>
  );
}
