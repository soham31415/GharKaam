import "server-only";
import { TIMEZONE } from "@/lib/config";
import { getDb, type DbOrTx } from "@/lib/db/client";
import * as q from "@/lib/db/queries/chores";
import { listActiveProfiles } from "@/lib/db/queries/profiles";
import type { ChoreRow, OccurrenceRow } from "@/lib/db/schema";
import { addDays, formatDate, formatTimestamp, isDateStr, relativeDueLabel, type DateStr } from "@/lib/domain/dates";
import {
  checkUndo,
  planAfterChoreEdit,
  planFirstOccurrence,
  planNextOccurrence,
  type ChoreAssignment,
  type ChoreSchedule,
  type PlannedOccurrence,
} from "@/lib/domain/occurrences";
import { describeSpec, rruleToSpec, specToRRule } from "@/lib/domain/recurrence";
import type { ChoreDetail, ChoreSummary, OccurrenceView, PersonRef, Profile, TodayView } from "@/lib/types";
import type { ChoreInput } from "@/lib/validation/chores";
import { dateOf, today } from "./clock";
import { AppError } from "./errors";
import { assertAdmin } from "./profiles";

// ── Helpers ─────────────────────────────────────────────────────────────────

function scheduleOf(chore: Pick<ChoreRow, "rrule" | "startDate" | "scheduleMode">): ChoreSchedule {
  return { rrule: chore.rrule, startDate: chore.startDate, scheduleMode: chore.scheduleMode };
}

// Note: queries inside a transaction run one at a time (no Promise.all) — a
// transaction is a single connection.
async function assignmentOf(db: DbOrTx, chore: ChoreRow): Promise<ChoreAssignment> {
  const rotation = await q.listRotations(db, [chore.id]);
  const active = await listActiveProfiles(db);
  return {
    mode: chore.assignmentMode,
    assigneeId: chore.assigneeId,
    rotation: rotation.map((r) => ({ profileId: r.profileId, active: r.active })),
    activeProfileIds: new Set(active.map((p) => p.id)),
  };
}

/** Every person referenced by the form must be an active profile. */
async function assertActivePeople(db: DbOrTx, ids: (string | null)[]): Promise<void> {
  const active = new Set((await listActiveProfiles(db)).map((p) => p.id));
  for (const id of ids) {
    if (id && !active.has(id)) throw new AppError("validation", "One of the selected people no longer exists.");
  }
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function lockPending(db: DbOrTx, occurrenceId: string): Promise<{ occ: OccurrenceRow; chore: ChoreRow }> {
  const first = await q.findOccurrenceById(db, occurrenceId);
  if (!first) throw new AppError("not_found", "That task no longer exists.");
  // Lock the chore first so concurrent taps on the same chore run one after another…
  const chore = await q.lockChore(db, first.choreId);
  if (!chore) throw new AppError("not_found", "That chore no longer exists.");
  // …then re-read the occurrence, which may have been closed while we waited.
  const occ = await q.findOccurrenceById(db, occurrenceId);
  if (!occ) throw new AppError("not_found", "That task no longer exists.");
  return { occ, chore };
}

async function closedByName(db: DbOrTx, occ: OccurrenceRow): Promise<string> {
  const row = await q.findOccurrenceWithPeople(db, occ.id);
  return row?.closedByName ?? "someone";
}

async function writePlan(
  db: DbOrTx,
  choreId: string,
  pending: OccurrenceRow | undefined,
  plan: PlannedOccurrence | null,
): Promise<void> {
  if (!plan) {
    if (pending) await q.deleteOccurrence(db, pending.id);
    return;
  }
  if (pending) {
    await q.updateOccurrence(db, pending.id, plan);
  } else {
    await q.insertOccurrence(db, { choreId, ...plan, status: "pending" });
  }
}

// ── Views ───────────────────────────────────────────────────────────────────

function toView(row: q.OccurrenceWithPeople, todayStr: DateStr, canUndo = false): OccurrenceView {
  const o = row.occurrence;
  return {
    id: o.id,
    choreId: o.choreId,
    choreTitle: row.choreTitle,
    choreNotes: row.choreNotes,
    dueDate: o.dueDate,
    dueLabel: relativeDueLabel(o.dueDate, todayStr),
    isOverdue: o.status === "pending" && o.dueDate < todayStr,
    assignee: o.assigneeId && row.assigneeName ? { id: o.assigneeId, name: row.assigneeName, avatar: row.assigneeAvatar } : null,
    status: o.status,
    closedByName: row.closedByName,
    closedLabel: o.closedAt ? formatTimestamp(o.closedAt, TIMEZONE) : null,
    canUndo,
  };
}

function assignmentText(chore: ChoreRow, rotation: q.RotationRow[], names: Map<string, string>): string {
  if (chore.assignmentMode === "anyone") return "Anyone";
  if (chore.assignmentMode === "rotation") {
    const list = rotation.map((r) => (r.active ? r.name : `${r.name} (archived)`)).join(" → ");
    return `Rotates: ${list || "nobody"}`;
  }
  return (chore.assigneeId && names.get(chore.assigneeId)) || "Anyone (assignee archived)";
}

function involvedPeople(
  chore: ChoreRow,
  rotation: q.RotationRow[],
  people: Map<string, { name: string; avatar: string | null }>,
): PersonRef[] {
  const ref = (id: string): PersonRef | null => {
    const p = people.get(id);
    return p ? { id, name: p.name, avatar: p.avatar } : null;
  };
  if (chore.assignmentMode === "rotation") {
    return rotation.filter((r) => r.active).flatMap((r) => ref(r.profileId) ?? []);
  }
  if (chore.assignmentMode === "fixed" && chore.assigneeId) return [ref(chore.assigneeId)].flatMap((p) => p ?? []);
  return [];
}

function scheduleText(chore: ChoreRow): string {
  const base = describeSpec(rruleToSpec(chore.rrule));
  if (!chore.rrule) return `${base} (${formatDate(chore.startDate)})`;
  return chore.scheduleMode === "after_completion" ? `${base}, counted from when it was last done` : base;
}

/** Which closed occurrences can be undone (latest per chore, still followed by its own next task). */
async function undoableIds(db: DbOrTx, rows: q.OccurrenceWithPeople[]): Promise<Set<string>> {
  const choreIds = [...new Set(rows.filter((r) => !r.choreArchived).map((r) => r.occurrence.choreId))];
  const [latest, pending] = await Promise.all([q.latestClosedIdsByChore(db, choreIds), q.listPendingForChores(db, choreIds)]);
  const pendingByChore = new Map(pending.map((p) => [p.occurrence.choreId, p.occurrence]));
  const ok = new Set<string>();
  for (const r of rows) {
    if (r.choreArchived) continue;
    const p = pendingByChore.get(r.occurrence.choreId);
    const check = checkUndo({
      target: r.occurrence,
      latestClosedId: latest.get(r.occurrence.choreId) ?? null,
      pending: p ? { id: p.id, previousOccurrenceId: p.previousOccurrenceId } : null,
    });
    if (check.ok) ok.add(r.occurrence.id);
  }
  return ok;
}

export async function getTodayView(me: Profile): Promise<TodayView> {
  const t = today();
  const tomorrow = addDays(t, 1);
  const rows = await q.listPendingDueBy(getDb(), tomorrow);
  const all = rows.map((r) => toView(r, t));
  const views = all.filter((v) => v.dueDate <= t);
  return {
    today: t,
    todayLabel: formatDate(t, t),
    mine: views.filter((v) => v.assignee?.id === me.id),
    anyone: views.filter((v) => v.assignee === null),
    others: views.filter((v) => v.assignee !== null && v.assignee.id !== me.id),
    tomorrow: all.filter((v) => v.dueDate === tomorrow),
  };
}

export async function listChores(me: Profile, opts: { filter: "all" | "mine"; archived: boolean }): Promise<ChoreSummary[]> {
  const db = getDb();
  const t = today();
  const choreRows = await q.listChoreRows(db, { archived: opts.archived });
  const ids = choreRows.map((c) => c.id);
  const [rotations, pending, people] = await Promise.all([
    q.listRotations(db, ids),
    q.listPendingForChores(db, ids),
    listActiveProfiles(db),
  ]);
  const names = new Map(people.map((p) => [p.id, p.name]));
  const byId = new Map(people.map((p) => [p.id, p]));
  const pendingByChore = new Map(pending.map((p) => [p.occurrence.choreId, p]));

  const items = choreRows.map((chore): { summary: ChoreSummary; involvesMe: boolean } => {
    const rotation = rotations.filter((r) => r.choreId === chore.id);
    const p = pendingByChore.get(chore.id);
    return {
      summary: {
        id: chore.id,
        title: chore.title,
        notes: chore.notes,
        scheduleText: scheduleText(chore),
        scheduleMode: chore.scheduleMode,
        assignmentMode: chore.assignmentMode,
        assignmentText: assignmentText(chore, rotation, names),
        people: involvedPeople(chore, rotation, byId),
        archived: chore.archivedAt !== null,
        next: p ? toView(p, t) : null,
      },
      involvesMe:
        p?.occurrence.assigneeId === me.id ||
        (chore.assignmentMode === "fixed" && chore.assigneeId === me.id) ||
        (chore.assignmentMode === "rotation" && rotation.some((r) => r.profileId === me.id)),
    };
  });

  return items
    .filter((i) => opts.filter === "all" || i.involvesMe)
    .map((i) => i.summary)
    .sort((a, b) => (a.next?.dueDate ?? "9999").localeCompare(b.next?.dueDate ?? "9999") || a.title.localeCompare(b.title));
}

export async function getChoreDetail(id: string): Promise<ChoreDetail | null> {
  const db = getDb();
  const chore = await q.findChoreById(db, id);
  if (!chore) return null;
  const t = today();
  const [rotation, pendingRows, people, closed] = await Promise.all([
    q.listRotations(db, [id]),
    q.listPendingForChores(db, [id]),
    listActiveProfiles(db),
    q.listClosed(db, { limit: 20, choreId: id }),
  ]);
  const names = new Map(people.map((p) => [p.id, p.name]));
  const canUndo = await undoableIds(db, closed);
  return {
    id: chore.id,
    title: chore.title,
    notes: chore.notes,
    scheduleText: scheduleText(chore),
    scheduleMode: chore.scheduleMode,
    assignmentMode: chore.assignmentMode,
    assignmentText: assignmentText(chore, rotation, names),
    people: involvedPeople(chore, rotation, new Map(people.map((p) => [p.id, p]))),
    archived: chore.archivedAt !== null,
    next: pendingRows[0] ? toView(pendingRows[0], t) : null,
    form: {
      title: chore.title,
      notes: chore.notes,
      startDate: chore.startDate,
      spec: rruleToSpec(chore.rrule),
      scheduleMode: chore.scheduleMode,
      assignmentMode: chore.assignmentMode,
      assigneeId: chore.assigneeId,
      rotationIds: rotation.map((r) => r.profileId),
    },
    history: closed.map((r) => toView(r, t, canUndo.has(r.occurrence.id))),
  };
}

export async function getHistory(opts: { limit: number }): Promise<OccurrenceView[]> {
  const db = getDb();
  const t = today();
  const rows = await q.listClosed(db, { limit: opts.limit });
  const canUndo = await undoableIds(db, rows);
  return rows.map((r) => toView(r, t, canUndo.has(r.occurrence.id)));
}

// ── Changes ─────────────────────────────────────────────────────────────────

export async function createChore(actor: Profile, input: ChoreInput): Promise<{ id: string }> {
  const rrule = specToRRule(input.spec);
  return getDb().transaction(async (tx) => {
    await assertActivePeople(tx, [input.assignment.assigneeId, ...input.assignment.rotationIds]);
    const chore = await q.insertChore(tx, {
      title: input.title,
      notes: input.notes,
      rrule,
      startDate: input.startDate,
      scheduleMode: input.scheduleMode,
      assignmentMode: input.assignment.mode,
      assigneeId: input.assignment.assigneeId,
      createdBy: actor.id,
    });
    await q.replaceRotation(tx, chore.id, input.assignment.rotationIds);

    const startIndex = Math.max(0, input.assignment.rotationIds.indexOf(input.assignment.rotationStartId ?? ""));
    const plan = planFirstOccurrence(scheduleOf(chore), await assignmentOf(tx, chore), today(), startIndex);
    if (!plan) {
      throw new AppError("validation", "This schedule has no dates from today onwards. Check the start and end dates.");
    }
    await q.insertOccurrence(tx, { choreId: chore.id, ...plan, status: "pending" });
    return { id: chore.id };
  });
}

export async function updateChore(actor: Profile, id: string, input: ChoreInput): Promise<void> {
  void actor; // everyone may edit chores
  const rrule = specToRRule(input.spec);
  await getDb().transaction(async (tx) => {
    const before = await q.lockChore(tx, id);
    if (!before) throw new AppError("not_found", "That chore no longer exists.");
    if (before.archivedAt) throw new AppError("conflict", "Restore this chore before editing it.");
    await assertActivePeople(tx, [input.assignment.assigneeId, ...input.assignment.rotationIds]);

    const oldRotation = (await q.listRotations(tx, [id])).map((r) => r.profileId);
    const scheduleChanged =
      rrule !== before.rrule || input.startDate !== before.startDate || input.scheduleMode !== before.scheduleMode;
    const assignmentChanged =
      input.assignment.mode !== before.assignmentMode ||
      input.assignment.assigneeId !== before.assigneeId ||
      !sameList(input.assignment.rotationIds, oldRotation);

    const chore = (await q.updateChore(tx, id, {
      title: input.title,
      notes: input.notes,
      rrule,
      startDate: input.startDate,
      scheduleMode: input.scheduleMode,
      assignmentMode: input.assignment.mode,
      assigneeId: input.assignment.assigneeId,
    }))!;
    if (!sameList(input.assignment.rotationIds, oldRotation)) {
      await q.replaceRotation(tx, id, input.assignment.rotationIds);
    }

    const pending = await q.findPendingForChore(tx, id);
    const lastClosed = await q.findLatestClosedForChore(tx, id);
    const plan = planAfterChoreEdit({
      schedule: scheduleOf(chore),
      assignment: await assignmentOf(tx, chore),
      pending: pending
        ? { dueDate: pending.dueDate, assigneeId: pending.assigneeId, rotationIndex: pending.rotationIndex }
        : null,
      lastClosedOn: lastClosed?.closedAt ? dateOf(lastClosed.closedAt) : null,
      today: today(),
      scheduleChanged,
      assignmentChanged,
    });
    await writePlan(tx, id, pending, plan);
  });
}

export async function archiveChore(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    const chore = await q.lockChore(tx, id);
    if (!chore || chore.archivedAt) throw new AppError("not_found", "That chore no longer exists.");
    await q.updateChore(tx, id, { archivedAt: new Date() });
    const pending = await q.findPendingForChore(tx, id);
    if (pending) await q.deleteOccurrence(tx, pending.id);
  });
}

export async function restoreChore(actor: Profile, id: string): Promise<void> {
  assertAdmin(actor);
  await getDb().transaction(async (tx) => {
    const chore = await q.lockChore(tx, id);
    if (!chore || !chore.archivedAt) throw new AppError("not_found", "That chore isn't archived.");
    const restored = (await q.updateChore(tx, id, { archivedAt: null }))!;
    const lastClosed = await q.findLatestClosedForChore(tx, id);
    const plan = planAfterChoreEdit({
      schedule: scheduleOf(restored),
      assignment: await assignmentOf(tx, restored),
      pending: null,
      lastClosedOn: lastClosed?.closedAt ? dateOf(lastClosed.closedAt) : null,
      today: today(),
      scheduleChanged: true,
      assignmentChanged: true,
    });
    await writePlan(tx, id, undefined, plan);
  });
}

/** Mark a task done or skipped, and create the chore's next task. */
export async function closeOccurrence(
  actor: Profile,
  occurrenceId: string,
  status: "done" | "skipped",
): Promise<{ nextDue: DateStr | null }> {
  return getDb().transaction(async (tx) => {
    const { occ, chore } = await lockPending(tx, occurrenceId);
    if (occ.status !== "pending") {
      const verb = occ.status === "done" ? "done" : "skipped";
      throw new AppError("conflict", `Already marked ${verb} by ${await closedByName(tx, occ)}.`);
    }
    await q.updateOccurrence(tx, occ.id, { status, closedBy: actor.id, closedAt: new Date() });
    if (chore.archivedAt) return { nextDue: null };

    const plan = planNextOccurrence(
      scheduleOf(chore),
      await assignmentOf(tx, chore),
      { dueDate: occ.dueDate, rotationIndex: occ.rotationIndex },
      today(),
    );
    if (plan) await q.insertOccurrence(tx, { choreId: chore.id, ...plan, status: "pending", previousOccurrenceId: occ.id });
    return { nextDue: plan?.dueDate ?? null };
  });
}

/** Reopen the most recent done/skip of a chore and remove the task it created. */
export async function undoOccurrence(actor: Profile, occurrenceId: string): Promise<void> {
  void actor;
  await getDb().transaction(async (tx) => {
    const { occ, chore } = await lockPending(tx, occurrenceId);
    if (chore.archivedAt) throw new AppError("conflict", "Restore this chore before undoing.");
    const latest = await q.findLatestClosedForChore(tx, chore.id);
    const pending = await q.findPendingForChore(tx, chore.id);
    const check = checkUndo({
      target: occ,
      latestClosedId: latest?.id ?? null,
      pending: pending ? { id: pending.id, previousOccurrenceId: pending.previousOccurrenceId } : null,
    });
    if (!check.ok) throw new AppError("conflict", check.reason);
    if (check.deletePendingId) await q.deleteOccurrence(tx, check.deletePendingId);
    await q.updateOccurrence(tx, occ.id, { status: "pending", closedBy: null, closedAt: null });
  });
}

/** Hand one task to someone else (or to anyone). The rotation order is unchanged. */
export async function reassignOccurrence(actor: Profile, occurrenceId: string, assigneeId: string | null): Promise<void> {
  void actor;
  await getDb().transaction(async (tx) => {
    const { occ } = await lockPending(tx, occurrenceId);
    if (occ.status !== "pending") throw new AppError("conflict", "This task is already closed.");
    await assertActivePeople(tx, [assigneeId]);
    await q.updateOccurrence(tx, occ.id, { assigneeId });
  });
}

/** Move one task to another date. The chore's schedule is unchanged. */
export async function moveOccurrence(actor: Profile, occurrenceId: string, dueDate: DateStr): Promise<void> {
  void actor;
  if (!isDateStr(dueDate)) throw new AppError("validation", "Pick a valid date.");
  await getDb().transaction(async (tx) => {
    const { occ } = await lockPending(tx, occurrenceId);
    if (occ.status !== "pending") throw new AppError("conflict", "This task is already closed.");
    await q.updateOccurrence(tx, occ.id, { dueDate });
  });
}
