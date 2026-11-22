/**
 * Rotation: a chore cycles through an ordered list of members. Each new
 * occurrence goes to the next *active* member after the previous occurrence's
 * planned position. Archived members are skipped but keep their slot, so
 * restoring them puts them back in the same place.
 */

export type RotationMember = { profileId: string; active: boolean };

/**
 * Index of the member who gets the next occurrence.
 * @param prevIndex position used by the previous occurrence, or null to start
 *   from the top (`startIndex`, default 0, is then used inclusively).
 * @returns null when nobody in the list is active.
 */
export function nextRotationIndex(
  members: readonly RotationMember[],
  prevIndex: number | null,
  startIndex = 0,
): number | null {
  const n = members.length;
  if (n === 0) return null;
  const start = prevIndex === null ? mod(startIndex, n) : mod(prevIndex + 1, n);
  for (let step = 0; step < n; step++) {
    const i = (start + step) % n;
    if (members[i].active) return i;
  }
  return null;
}

/** Keep an existing position if that member is still there and active; otherwise move on. */
export function keepOrAdvanceRotationIndex(
  members: readonly RotationMember[],
  currentIndex: number | null,
): number | null {
  if (currentIndex !== null && currentIndex < members.length && members[currentIndex].active) return currentIndex;
  return currentIndex === null ? nextRotationIndex(members, null) : nextRotationIndex(members, currentIndex - 1);
}

function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}
