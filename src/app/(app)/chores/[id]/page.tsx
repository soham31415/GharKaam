import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveChoreButton } from "@/components/chores/archive-chore-button";
import { ChoreForm } from "@/components/chores/chore-form";
import { DoneSkipButtons, ReassignMoveForms, UndoButton } from "@/components/chores/occurrence-actions";
import { ClosedOccurrenceRow } from "@/components/chores/occurrence-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getChoreDetail } from "@/lib/services/chores";
import { today } from "@/lib/services/clock";
import { listPeople } from "@/lib/services/profiles";
import { requireProfile } from "@/lib/services/session";
import { uuid } from "@/lib/validation/form";

export default async function ChorePage({ params }: PageProps<"/chores/[id]">) {
  const me = await requireProfile();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [chore, people] = await Promise.all([getChoreDetail(id), listPeople()]);
  if (!chore) notFound();

  return (
    <>
      <Link href="/chores" className="text-sm underline-offset-4 hover:underline">
        ← All chores
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {chore.title} {chore.archived ? <Badge variant="outline">Archived</Badge> : null}
        </h1>
        <p className="text-sm text-muted-foreground">{chore.scheduleText}</p>
        <p className="text-sm text-muted-foreground">{chore.assignmentText}</p>
        {chore.notes ? <p className="text-sm">{chore.notes}</p> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next</CardTitle>
          <CardDescription>
            {chore.next
              ? `${chore.next.dueLabel} · ${chore.next.assignee ? chore.next.assignee.name : "Anyone"}`
              : chore.archived
                ? "Archived chores have no open task."
                : "No upcoming date. The chore is finished; change its schedule to bring it back."}
          </CardDescription>
        </CardHeader>
        {chore.next ? (
          <CardContent className="flex flex-col gap-4">
            <DoneSkipButtons occurrenceId={chore.next.id} title={chore.title} />
            <ReassignMoveForms
              occurrenceId={chore.next.id}
              assigneeId={chore.next.assignee?.id ?? null}
              dueDate={chore.next.dueDate}
              people={people}
            />
          </CardContent>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {chore.history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not done yet.</p>
          ) : (
            <ul>
              {chore.history.map((occ) => (
                <ClosedOccurrenceRow
                  key={occ.id}
                  occ={occ}
                  showTitle={false}
                  undo={occ.canUndo ? <UndoButton occurrenceId={occ.id} title={chore.title} /> : null}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!chore.archived ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit chore</CardTitle>
          </CardHeader>
          <CardContent>
            <ChoreForm choreId={chore.id} values={chore.form} people={people} today={today()} meId={me.id} />
          </CardContent>
        </Card>
      ) : null}

      {me.isAdmin ? <ArchiveChoreButton choreId={chore.id} archived={chore.archived} /> : null}
    </>
  );
}
