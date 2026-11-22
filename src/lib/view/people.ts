/**
 * Presentation helpers for family members. Pure, no React.
 * Each person gets an avatar colour by family order (6 colours, then they repeat).
 */

export const TONE_COUNT = 6;

/** 0-based colour index for a person, by their position in the family list. Unknown people get a stable fallback. */
export function toneIndex(personId: string, familyOrder: readonly string[]): number {
  const at = familyOrder.indexOf(personId);
  if (at >= 0) return at % TONE_COUNT;
  let hash = 0;
  for (const ch of personId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % TONE_COUNT;
}

/** First letter of a name, upper-cased ("rohan" → "R"). Handles names that start with an emoji or accent. */
export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0] ?? "?";
  return first.toLocaleUpperCase("en-IN");
}

/** "1st turn", "2nd", "3rd", "4th"… for the rotation order badges (`withTurn: false` → "1st"). */
export function turnLabel(position: number, withTurn = true): string {
  const s = position % 100 >= 11 && position % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][position % 10] ?? "th");
  return position === 1 && withTurn ? "1st turn" : `${position}${s}`;
}

/** Each ticked person's place in the turn order, starting from `startId` (or the first ticked person). */
export function turnOrder(familyOrder: readonly string[], ticked: readonly string[], startId: string | null): Map<string, number> {
  const rotation = familyOrder.filter((id) => ticked.includes(id));
  const start = Math.max(0, startId ? rotation.indexOf(startId) : 0);
  return new Map(rotation.map((id, i) => [id, ((i - start + rotation.length) % rotation.length) + 1]));
}
