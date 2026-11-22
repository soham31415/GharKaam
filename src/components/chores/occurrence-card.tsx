import Link from "next/link";
import { Pill } from "@/components/shell/grouped";
import type { OccurrenceView } from "@/lib/types";

/** A done/skipped task in history (a row inside a GroupCard). */
export function ClosedOccurrenceRow({
  occ,
  showTitle = true,
  undo,
}: {
  occ: OccurrenceView;
  showTitle?: boolean;
  undo?: React.ReactNode;
}) {
  const done = occ.status === "done";
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <Pill tone={done ? "done" : "neutral"}>{done ? "Done" : "Skipped"}</Pill>
          {showTitle ? (
            <Link href={`/chores/${occ.choreId}`} className="truncate text-base font-semibold">
              {occ.choreTitle}
            </Link>
          ) : null}
        </div>
        <p className="text-[13px] leading-snug text-muted-foreground">
          {done ? "Done" : "Skipped"} by {occ.closedByName ?? "someone"} · {occ.closedLabel}
          {occ.assignee && occ.assignee.name !== occ.closedByName ? ` · was ${occ.assignee.name}'s turn` : ""}
        </p>
      </div>
      {undo}
    </div>
  );
}
