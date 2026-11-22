"use client";

import { cn } from "cn";
import { Check, Clock, Sun } from "lucide-react";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { closeOccurrenceAction, undoOccurrenceAction } from "@/actions/chores";
import { HouseWithChai } from "@/components/illustrations";
import { PersonTag } from "@/components/people/avatar";
import { EmptyState, GroupCard, Pill, Section } from "@/components/shell/grouped";
import { callAction } from "@/components/use-toast-action";
import type { OccurrenceView } from "@/lib/types";
import { duePillLabel } from "@/lib/view/today";
import { useSwipeRow, type SwipeOutcome } from "./use-swipe-row";

type SectionKey = "mine" | "anyone" | "others";
type Item = { occ: OccurrenceView; section: SectionKey };

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "mine", label: "Mine" },
  { key: "anyone", label: "Anyone can do" },
  { key: "others", label: "Everyone else" },
];

/** How long a row someone else closed stays on screen, glowing, before it collapses. */
const GHOST_MS = 1000;
/** Done: let the tick register before the row collapses. Skip collapses straight away. */
const MARK_MS = { done: 280, skipped: 60 };
const COLLAPSE_MS = 260;

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

/**
 * Today's open tasks in three sections. Done / Skip hide the row straight
 * away (the server catches up a moment later) and offer Undo in the toast.
 * Rows that disappear because someone else acted glow briefly first.
 */
export function TaskList({ mine, anyone, others }: { mine: OccurrenceView[]; anyone: OccurrenceView[]; others: OccurrenceView[] }) {
  const items = useMemo<Item[]>(
    () => [
      ...mine.map((occ) => ({ occ, section: "mine" as const })),
      ...anyone.map((occ) => ({ occ, section: "anyone" as const })),
      ...others.map((occ) => ({ occ, section: "others" as const })),
    ],
    [mine, anyone, others],
  );

  /** Rows I'm closing: marked (tick shown) then leaving (collapsing). */
  const [closing, setClosing] = useState<Record<string, { outcome: SwipeOutcome; leaving: boolean }>>({});
  /** Rows I closed that the server may not have dropped yet. */
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  /** Rows someone else closed: kept for a moment so the change is visible. */
  const [ghosts, setGhosts] = useState<Item[]>([]);
  /** Rows that just appeared (someone added or reopened them). */
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  /** Bumped when a close fails, so the row remounts in its resting position. */
  const [revision, setRevision] = useState<Record<string, number>>({});

  // Compare with the previous server data while rendering (React's "adjust state on prop change" pattern).
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    const now = new Set(items.map((i) => i.occ.id));
    const before = new Set(prevItems.map((i) => i.occ.id));
    const gone = prevItems.filter((i) => !now.has(i.occ.id) && !hidden.has(i.occ.id) && !closing[i.occ.id]);
    const added = items.filter((i) => !before.has(i.occ.id)).map((i) => i.occ.id);
    setPrevItems(items);
    if (gone.length) setGhosts((g) => [...g.filter((x) => !now.has(x.occ.id)), ...gone]);
    if (added.length) setFresh(new Set(added));
    // The server has caught up on rows I hid; forget them so they show again if someone reopens them.
    if ([...hidden].some((id) => !now.has(id))) setHidden(new Set([...hidden].filter((id) => now.has(id))));
  }
  const currentIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    currentIds.current = new Set(items.map((i) => i.occ.id));
  }, [items]);

  useEffect(() => {
    if (fresh.size === 0) return;
    const t = setTimeout(() => setFresh(new Set()), 1200);
    return () => clearTimeout(t);
  }, [fresh]);

  const undo = (occ: OccurrenceView) =>
    startTransition(async () => {
      const res = await callAction(undoOccurrenceAction, { id: occ.id });
      if (res?.ok) {
        setHidden((h) => {
          const next = new Set(h);
          next.delete(occ.id);
          return next;
        });
        toast.success(`${occ.choreTitle}: ${res.message ?? "Undone."}`);
      } else if (res) {
        toast.error(res.error);
      }
    });

  const close = (occ: OccurrenceView, outcome: SwipeOutcome) => {
    if (closing[occ.id]) return;
    setClosing((c) => ({ ...c, [occ.id]: { outcome, leaving: false } }));
    setTimeout(() => setClosing((c) => (c[occ.id] ? { ...c, [occ.id]: { ...c[occ.id], leaving: true } } : c)), MARK_MS[outcome]);
    setTimeout(() => {
      // Only hide it if the server still lists it; otherwise it's already gone.
      if (currentIds.current.has(occ.id)) setHidden((h) => new Set(h).add(occ.id));
      setClosing((c) => without(c, occ.id));
    }, MARK_MS[outcome] + COLLAPSE_MS);

    startTransition(async () => {
      const res = await callAction(closeOccurrenceAction, { id: occ.id, status: outcome });
      if (res?.ok) {
        toast.success(`${occ.choreTitle}: ${res.message ?? "Done."}`, {
          action: { label: "Undo", onClick: () => undo(occ) },
          duration: 5000, // a little longer than plain toasts, so there's time to reach Undo
        });
        return;
      }
      // Put the row back.
      setHidden((h) => {
        const next = new Set(h);
        next.delete(occ.id);
        return next;
      });
      setClosing((c) => without(c, occ.id));
      setRevision((r) => ({ ...r, [occ.id]: (r[occ.id] ?? 0) + 1 }));
      if (res) toast.error(res.error);
    });
  };

  const visible = items.filter((i) => !hidden.has(i.occ.id));
  const sections = SECTIONS.map((s) => {
    const rows = visible.filter((i) => i.section === s.key);
    const ghostRows = ghosts.filter((g) => g.section === s.key);
    return { ...s, rows, ghostRows, count: rows.filter((r) => !closing[r.occ.id]?.leaving).length };
  }).filter((s) => s.rows.length + s.ghostRows.length > 0);

  if (sections.length === 0) {
    return (
      <div className="animate-in duration-300 ease-out fade-in-0 zoom-in-[0.97] motion-reduce:zoom-in-100">
        <EmptyState card art={<HouseWithChai className="mb-1" />} title="All caught up!">
          Nothing due today or overdue. The house says thank you. Go have some chai.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      {sections.map((s) => (
        <Section key={s.key} label={`${s.label} · ${s.count}`}>
          <GroupCard>
            {s.rows.map(({ occ }) => (
              <TaskRow
                key={`${occ.id}:${revision[occ.id] ?? 0}`}
                occ={occ}
                showAssignee={s.key === "others"}
                state={closing[occ.id]}
                fresh={fresh.has(occ.id)}
                onClose={(outcome) => close(occ, outcome)}
              />
            ))}
            {s.ghostRows.map(({ occ }) => (
              <GhostRow
                key={`ghost:${occ.id}`}
                occ={occ}
                showAssignee={s.key === "others"}
                onGone={() => setGhosts((g) => g.filter((x) => x.occ.id !== occ.id))}
              />
            ))}
          </GroupCard>
        </Section>
      ))}
    </>
  );
}

function DuePill({ occ }: { occ: OccurrenceView }) {
  return occ.isOverdue ? (
    <Pill tone="danger">
      <Clock aria-hidden="true" strokeWidth={2.6} />
      {duePillLabel(occ.dueLabel)}
    </Pill>
  ) : (
    <Pill tone="soon">
      <Sun aria-hidden="true" strokeWidth={2.6} />
      {duePillLabel(occ.dueLabel)}
    </Pill>
  );
}

function RowBody({ occ, showAssignee }: { occ: OccurrenceView; showAssignee: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[5px] py-1">
      <Link href={`/chores/${occ.choreId}`} className="text-[17px] leading-snug font-semibold text-foreground">
        {occ.choreTitle}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <DuePill occ={occ} />
        {showAssignee && occ.assignee ? <PersonTag person={occ.assignee} /> : null}
      </div>
      {occ.choreNotes ? <p className="text-[13.5px] leading-snug text-muted-foreground">{occ.choreNotes}</p> : null}
    </div>
  );
}

function TaskRow({
  occ,
  showAssignee,
  state,
  fresh,
  onClose,
}: {
  occ: OccurrenceView;
  showAssignee: boolean;
  state?: { outcome: SwipeOutcome; leaving: boolean };
  fresh: boolean;
  onClose: (outcome: SwipeOutcome) => void;
}) {
  const busy = Boolean(state);
  const { surfaceRef, trackRef, handlers } = useSwipeRow({ enabled: !busy, onCommit: onClose });
  const ticked = state?.outcome === "done";

  return (
    <div className="collapsible-row" data-leaving={state?.leaving ? "" : undefined}>
      <div>
        <div ref={trackRef} className="group/swipe relative">
          {/* Revealed behind the row while swiping. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-between px-5 text-[15px] font-bold text-white opacity-0 group-data-swipe/swipe:opacity-100 group-data-[swipe=done]/swipe:bg-done group-data-[swipe=skip]/swipe:bg-[#8E8E93] dark:group-data-[swipe=done]/swipe:bg-[#15803D] dark:group-data-[swipe=skip]/swipe:bg-[#48484A]"
          >
            <span className="flex items-center gap-2 opacity-0 transition-[transform,opacity] duration-150 ease-out group-data-[swipe=done]/swipe:opacity-70 group-data-armed/swipe:scale-110 group-data-armed/swipe:opacity-100">
              <Check className="size-5" strokeWidth={3} />
              Done
            </span>
            <span className="opacity-0 transition-[transform,opacity] duration-150 ease-out group-data-[swipe=skip]/swipe:opacity-70 group-data-armed/swipe:scale-110 group-data-armed/swipe:opacity-100">
              Skip
            </span>
          </div>
          <div
            ref={surfaceRef}
            {...handlers}
            className={cn(
              "relative flex touch-pan-y items-center gap-0.5 bg-card py-2 pr-2 pl-1 will-change-transform",
              fresh && "live-glow",
            )}
          >
            <button
              type="button"
              onClick={() => onClose("done")}
              disabled={busy}
              aria-label={`Mark ${occ.choreTitle} done`}
              className="group/done flex size-12 shrink-0 items-center justify-center"
            >
              <span
                className={cn(
                  "flex size-[26px] items-center justify-center rounded-full border-2 border-primary transition-[background-color,transform] duration-150 ease-out group-active/done:scale-90",
                  ticked && "scale-110 bg-primary",
                )}
              >
                <Check
                  aria-hidden="true"
                  strokeWidth={3.2}
                  className={cn(
                    "size-4 text-primary-foreground transition-[opacity,transform] duration-150 ease-out",
                    ticked ? "scale-100 opacity-100" : "scale-50 opacity-0",
                  )}
                />
              </span>
            </button>
            <RowBody occ={occ} showAssignee={showAssignee} />
            <button
              type="button"
              onClick={() => onClose("skipped")}
              disabled={busy}
              className="pressable h-9 shrink-0 rounded-full bg-neutral px-3 text-sm font-semibold text-neutral-foreground disabled:opacity-60"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A row someone else just closed: glows in the due-soon tint, then collapses. */
function GhostRow({ occ, showAssignee, onGone }: { occ: OccurrenceView; showAssignee: boolean; onGone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), GHOST_MS);
    const b = setTimeout(onGone, GHOST_MS + COLLAPSE_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
    // onGone is recreated each render; the timers only need to start once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="collapsible-row" data-leaving={leaving ? "" : undefined} aria-hidden="true">
      <div>
        <div className="live-glow flex items-center gap-0.5 py-2 pr-2 pl-1">
          <span className="flex size-12 shrink-0 items-center justify-center">
            <span className="size-[26px] rounded-full border-2 border-chevron" />
          </span>
          <RowBody occ={occ} showAssignee={showAssignee} />
        </div>
      </div>
    </div>
  );
}
