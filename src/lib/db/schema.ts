import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Every table has row level security ENABLED with NO policies. That makes
 * Supabase's public REST API return nothing for the publishable key, while the
 * app's own Drizzle connection (table owner) is unaffected.
 */

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

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
