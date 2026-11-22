import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { OccurrenceView } from "@/lib/types";
import { DoneSkipButtons } from "./occurrence-actions";

/** An open task with Done / Skip. */
export function OccurrenceCard({ occ, showAssignee = true }: { occ: OccurrenceView; showAssignee?: boolean }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href={`/chores/${occ.choreId}`} className="font-medium underline-offset-4 hover:underline">
            {occ.choreTitle}
          </Link>
          <Badge variant={occ.isOverdue ? "destructive" : "secondary"}>{occ.dueLabel}</Badge>
        </div>
        {showAssignee ? (
          <p className="text-sm text-muted-foreground">
            {occ.assignee ? `${occ.assignee.avatar ?? ""} ${occ.assignee.name}`.trim() : "Anyone"}
          </p>
        ) : null}
        {occ.choreNotes ? <p className="text-sm text-muted-foreground">{occ.choreNotes}</p> : null}
        <DoneSkipButtons occurrenceId={occ.id} title={occ.choreTitle} />
      </CardContent>
    </Card>
  );
}

/** A done/skipped task in history. */
export function ClosedOccurrenceRow({
  occ,
  showTitle = true,
  undo,
}: {
  occ: OccurrenceView;
  showTitle?: boolean;
  undo?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1 border-b py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={occ.status === "done" ? "secondary" : "outline"}>{occ.status === "done" ? "Done" : "Skipped"}</Badge>
        {showTitle ? (
          <Link href={`/chores/${occ.choreId}`} className="font-medium underline-offset-4 hover:underline">
            {occ.choreTitle}
          </Link>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">
        {occ.status === "done" ? "Done" : "Skipped"} by {occ.closedByName ?? "someone"} · {occ.closedLabel}
        {occ.assignee && occ.assignee.name !== occ.closedByName ? ` · was ${occ.assignee.name}'s turn` : ""}
      </p>
      {undo}
    </li>
  );
}
