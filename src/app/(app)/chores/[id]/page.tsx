import { cn } from "cn";
import { Repeat } from "lucide-react";
import { notFound } from "next/navigation";
import { ArchiveChoreButton } from "@/components/chores/archive-chore-button";
import { EditChoreSheet } from "@/components/chores/new-chore-sheet";
import { DoneSkipButtons, ReassignMoveForms, UndoButton } from "@/components/chores/occurrence-actions";
import { ClosedOccurrenceRow } from "@/components/chores/occurrence-card";
import { AnyoneAvatar, Avatar } from "@/components/people/avatar";
import { BackLink } from "@/components/shell/back-link";
import { GroupCard, Pill, Section } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { getChoreDetail } from "@/lib/services/chores";
import { today as todayIn } from "@/lib/services/clock";
import { listPeople } from "@/lib/services/profiles";
import { requireProfile } from "@/lib/services/session";
import { uuid } from "@/lib/validation/form";
import { dateTile, whoText } from "@/lib/view/chores";

const TILE = {
  danger: "bg-danger text-danger-foreground",
  soon: "bg-soon text-soon-foreground",
  neutral: "bg-neutral text-[#3A3A3C] dark:text-[#E5E5EA]",
};

export default async function ChorePage({ params }: PageProps<"/chores/[id]">) {
  const me = await requireProfile();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [chore, people] = await Promise.all([getChoreDetail(id), listPeople()]);
  if (!chore) notFound();
  const t = todayIn();
  const tile = dateTile(chore.next?.dueDate ?? null, t);

  return (
    <>
      <BackLink href="/chores">Chores</BackLink>
      <PageHeader
        title={chore.title}
        trailing={!chore.archived ? <EditChoreSheet choreId={chore.id} title={chore.title} values={chore.form} today={t} /> : null}
        subtitle={chore.archived ? <Pill>Archived</Pill> : undefined}
      />

      <GroupCard>
        <div className="flex items-center gap-3 px-4 py-3">
          <Repeat aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" strokeWidth={2} />
          <span className="text-base">{chore.scheduleText}</span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="inline-flex shrink-0 -space-x-[5px]">
            {chore.people.length === 0 ? <AnyoneAvatar ring /> : chore.people.map((p) => <Avatar key={p.id} person={p} ring />)}
          </span>
          <span className="text-base">{chore.assignmentMode === "rotation" ? chore.assignmentText.replace("Rotates: ", "Takes turns: ") : whoText(chore)}</span>
        </div>
        {chore.notes ? <p className="px-4 py-3 text-[15px] text-secondary-foreground">{chore.notes}</p> : null}
      </GroupCard>

      <Section label="Next">
        <GroupCard>
          {chore.next ? (
            <>
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-[50px] w-[46px] shrink-0 flex-col items-center justify-center rounded-tile", TILE[tile.tone])}>
                    <span className="text-[10.5px] font-bold tracking-[0.4px]">{tile.top}</span>
                    <span className="font-heading text-[21px] leading-[1.05] font-black">{tile.day}</span>
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-semibold">{chore.next.dueLabel}</span>
                    <span className="text-[13px] text-muted-foreground">{chore.next.assignee ? chore.next.assignee.name : "Anyone"}</span>
                  </span>
                </div>
                <DoneSkipButtons occurrenceId={chore.next.id} title={chore.title} />
              </div>
              <ReassignMoveForms
                occurrenceId={chore.next.id}
                assigneeId={chore.next.assignee?.id ?? null}
                dueDate={chore.next.dueDate}
                people={people}
              />
            </>
          ) : (
            <p className="px-4 py-3.5 text-[15px] text-muted-foreground">
              {chore.archived
                ? "Archived chores have no open task."
                : "No upcoming date. The chore is finished; change its schedule to bring it back."}
            </p>
          )}
        </GroupCard>
      </Section>

      <Section label="History">
        <GroupCard>
          {chore.history.length === 0 ? (
            <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Not done yet.</p>
          ) : (
            chore.history.map((occ) => (
              <ClosedOccurrenceRow
                key={occ.id}
                occ={occ}
                showTitle={false}
                undo={occ.canUndo ? <UndoButton occurrenceId={occ.id} title={chore.title} /> : null}
              />
            ))
          )}
        </GroupCard>
      </Section>

      {me.isAdmin ? <ArchiveChoreButton choreId={chore.id} archived={chore.archived} /> : null}
    </>
  );
}
