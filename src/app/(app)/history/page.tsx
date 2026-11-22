import { UndoButton } from "@/components/chores/occurrence-actions";
import { ClosedOccurrenceRow } from "@/components/chores/occurrence-card";
import { HappyHouse } from "@/components/illustrations";
import { BackLink } from "@/components/shell/back-link";
import { EmptyState, GroupCard } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { getHistory } from "@/lib/services/chores";
import { requireProfile } from "@/lib/services/session";

export default async function HistoryPage() {
  await requireProfile();
  const history = await getHistory({ limit: 100 });
  return (
    <>
      <BackLink href="/more">More</BackLink>
      <PageHeader title="History" showProfile={false} subtitle="The last 100 done or skipped tasks, newest first." />
      {history.length === 0 ? (
        <EmptyState art={<HappyHouse />} title="Nothing done yet">
          Finished and skipped tasks show up here.
        </EmptyState>
      ) : (
        <GroupCard>
          {history.map((occ) => (
            <ClosedOccurrenceRow
              key={occ.id}
              occ={occ}
              undo={occ.canUndo ? <UndoButton occurrenceId={occ.id} title={occ.choreTitle} /> : null}
            />
          ))}
        </GroupCard>
      )}
    </>
  );
}
