import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listChores } from "@/lib/services/chores";
import { requireProfile } from "@/lib/services/session";

const TABS = [
  { key: "all", label: "All chores", href: "/chores" },
  { key: "mine", label: "My chores", href: "/chores?filter=mine" },
  { key: "archived", label: "Archived", href: "/chores?filter=archived" },
] as const;

export default async function ChoresPage({ searchParams }: PageProps<"/chores">) {
  const me = await requireProfile();
  const { filter } = await searchParams;
  const tab = filter === "mine" || filter === "archived" ? filter : "all";
  const chores = await listChores(me, { filter: tab === "mine" ? "mine" : "all", archived: tab === "archived" });

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Chores</h1>
        <Link href="/chores/new" className={buttonVariants({ size: "sm" })}>
          New chore
        </Link>
      </div>
      <nav className="flex gap-3 text-sm">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={t.key === tab ? "font-semibold underline underline-offset-4" : "underline-offset-4 hover:underline"}>
            {t.label}
          </Link>
        ))}
      </nav>

      {chores.length === 0 ? (
        <p className="text-muted-foreground">
          {tab === "archived" ? "No archived chores." : tab === "mine" ? "Nothing assigned to you." : "No chores yet."}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {chores.map((c) => (
          <li key={c.id}>
            <Card size="sm">
              <CardContent className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/chores/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.title}
                  </Link>
                  {c.next ? (
                    <Badge variant={c.next.isOverdue ? "destructive" : "secondary"}>{c.next.dueLabel}</Badge>
                  ) : (
                    <Badge variant="outline">{c.archived ? "Archived" : "Finished"}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{c.scheduleText}</p>
                <p className="text-sm text-muted-foreground">
                  {c.assignmentText}
                  {c.next && c.assignmentMode === "rotation" ? ` · next: ${c.next.assignee?.name ?? "anyone"}` : ""}
                  {c.next && c.assignmentMode === "fixed" && c.next.assignee?.name && !c.assignmentText.startsWith(c.next.assignee.name)
                    ? ` · this time: ${c.next.assignee.name}`
                    : ""}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
