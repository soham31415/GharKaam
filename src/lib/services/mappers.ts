import type { ProfileRow } from "@/lib/db/schema";
import type { Profile } from "@/lib/types";

/** DB row → DTO mappers. */

export function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    isAdmin: row.isAdmin,
    digestEnabled: row.digestEnabled,
    archived: row.archivedAt !== null,
  };
}
