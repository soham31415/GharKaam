import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Every table has row level security ENABLED with NO policies. That makes
 * Supabase's public REST API return nothing for the publishable key, while the
 * app's own Drizzle connection (table owner) is unaffected.
 *
 * Dates without a time of day (due dates, start dates) are `date` columns read
 * as "YYYY-MM-DD" strings.
 */

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const dateStr = (name: string) => date(name, { mode: "string" });

// ── Profiles ────────────────────────────────────────────────────────────────

export const profiles = pgTable(
  "profiles",
  {
    id: id(),
    name: text("name").notNull(),
    /** Optional emoji shown on the profile picker. */
    avatar: text("avatar"),
    /** Honour-system flag: only hides admin screens, not a security boundary. */
    isAdmin: boolean("is_admin").notNull().default(false),
    digestEnabled: boolean("digest_enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("profiles_active_idx").on(t.archivedAt, t.sortOrder)],
).enableRLS();

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;

// ── Chores ──────────────────────────────────────────────────────────────────

export const scheduleMode = pgEnum("schedule_mode", ["fixed", "after_completion"]);
export const assignmentMode = pgEnum("assignment_mode", ["fixed", "rotation", "anyone"]);
export const occurrenceStatus = pgEnum("occurrence_status", ["pending", "done", "skipped"]);

export const chores = pgTable(
  "chores",
  {
    id: id(),
    title: text("title").notNull(),
    notes: text("notes"),
    /** RRULE body without DTSTART (e.g. "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO"); null = one-time. */
    rrule: text("rrule"),
    /** First due date and the anchor for fixed schedules. */
    startDate: dateStr("start_date").notNull(),
    scheduleMode: scheduleMode("schedule_mode").notNull().default("fixed"),
    assignmentMode: assignmentMode("assignment_mode").notNull().default("fixed"),
    assigneeId: uuid("assignee_id").references(() => profiles.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => profiles.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chores_active_idx").on(t.archivedAt)],
).enableRLS();

export type ChoreRow = typeof chores.$inferSelect;
export type NewChoreRow = typeof chores.$inferInsert;

export const choreRotationMembers = pgTable(
  "chore_rotation_members",
  {
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.choreId, t.position] }),
    uniqueIndex("chore_rotation_members_unique_profile").on(t.choreId, t.profileId),
  ],
).enableRLS();

export const choreOccurrences = pgTable(
  "chore_occurrences",
  {
    id: id(),
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id, { onDelete: "cascade" }),
    dueDate: dateStr("due_date").notNull(),
    /** null = anyone can do it. */
    assigneeId: uuid("assignee_id").references(() => profiles.id, { onDelete: "set null" }),
    /** Position in the rotation this occurrence was planned for. */
    rotationIndex: integer("rotation_index"),
    status: occurrenceStatus("status").notNull().default("pending"),
    closedBy: uuid("closed_by").references(() => profiles.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    /** The occurrence whose completion created this one (used by undo). */
    previousOccurrenceId: uuid("previous_occurrence_id").references((): AnyPgColumn => choreOccurrences.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    // The "no pile-up" rule: at most one open occurrence per chore.
    uniqueIndex("chore_occurrences_one_pending").on(t.choreId).where(sql`${t.status} = 'pending'`),
    index("chore_occurrences_status_due_idx").on(t.status, t.dueDate),
    index("chore_occurrences_assignee_idx").on(t.assigneeId, t.status),
    index("chore_occurrences_closed_idx").on(t.closedAt),
  ],
).enableRLS();

export type OccurrenceRow = typeof choreOccurrences.$inferSelect;
export type NewOccurrenceRow = typeof choreOccurrences.$inferInsert;
