import { UndoButton } from "@/components/chores/occurrence-actions";
import { ClosedOccurrenceRow } from "@/components/chores/occurrence-card";
import { getHistory } from "@/lib/services/chores";
import { requireProfile } from "@/lib/services/session";

export default async function HistoryPage() {
  await requireProfile();
  const history = await getHistory({ limit: 100 });
  return (
    <>
      <h1 className="text-xl font-semibold">History</h1>
      {history.length === 0 ? <p className="text-muted-foreground">Nothing done yet.</p> : null}
      <ul>
        {history.map((occ) => (
          <ClosedOccurrenceRow key={occ.id} occ={occ} undo={occ.canUndo ? <UndoButton occurrenceId={occ.id} title={occ.choreTitle} /> : null} />
        ))}
      </ul>
    </>
  );
}
