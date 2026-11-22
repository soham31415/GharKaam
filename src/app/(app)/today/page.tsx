import Link from "next/link";
import { OccurrenceCard } from "@/components/chores/occurrence-card";
import { InstallHint } from "@/components/pwa/install-guide";
import { buttonVariants } from "@/components/ui/button";
import { getTodayView } from "@/lib/services/chores";
import { countShoppingList } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import type { OccurrenceView } from "@/lib/types";

function Section({ title, items, showAssignee }: { title: string; items: OccurrenceView[]; showAssignee: boolean }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">
        {title} ({items.length})
      </h2>
      {items.map((occ) => (
        <OccurrenceCard key={occ.id} occ={occ} showAssignee={showAssignee} />
      ))}
    </section>
  );
}

export default async function TodayPage() {
  const me = await requireProfile();
  const [view, shoppingCount] = await Promise.all([getTodayView(me), countShoppingList()]);
  const nothing = view.mine.length + view.anyone.length + view.others.length === 0;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Today · {view.todayLabel}</h1>
        <Link href="/chores/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
          New chore
        </Link>
      </div>
      <InstallHint />
      {shoppingCount > 0 ? (
        <Link href="/shopping" className="text-sm underline underline-offset-4">
          Shopping list: {shoppingCount} item{shoppingCount === 1 ? "" : "s"}
        </Link>
      ) : null}
      {nothing ? <p className="text-muted-foreground">Nothing due today or overdue.</p> : null}
      <Section title="Mine" items={view.mine} showAssignee={false} />
      <Section title="Anyone" items={view.anyone} showAssignee={false} />
      <Section title="Everyone else" items={view.others} showAssignee />
    </>
  );
}
