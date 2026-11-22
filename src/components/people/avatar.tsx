"use client";

import { cn } from "cn";
import { initialOf, toneIndex } from "@/lib/view/people";
import { useSession } from "./session-context";

// Static class names so Tailwind can see them.
const TONES = [
  "bg-tone-1 text-tone-1-foreground",
  "bg-tone-2 text-tone-2-foreground",
  "bg-tone-3 text-tone-3-foreground",
  "bg-tone-4 text-tone-4-foreground",
  "bg-tone-5 text-tone-5-foreground",
  "bg-tone-6 text-tone-6-foreground",
];

const SIZES = {
  xs: "size-5 text-[10.5px] font-bold",
  sm: "size-[34px] text-sm font-bold",
  md: "size-9 text-[15px] font-bold",
  lg: "size-[52px] text-[21px] font-extrabold",
  xl: "size-[72px] text-[28px] font-extrabold",
} as const;

/**
 * A family member's colour and initial. Large avatars show the person's emoji
 * instead of the initial when they have one.
 */
export function Avatar({
  person,
  size = "xs",
  ring = false,
  showEmoji = size === "lg" || size === "xl",
  className,
}: {
  person: { id: string; name: string; avatar?: string | null };
  size?: keyof typeof SIZES;
  /** White ring, for overlapping avatar stacks. */
  ring?: boolean;
  showEmoji?: boolean;
  className?: string;
}) {
  const { familyOrder } = useSession();
  const tone = TONES[toneIndex(person.id, familyOrder)];
  const emoji = showEmoji && person.avatar ? person.avatar : null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full leading-none",
        SIZES[size],
        tone,
        ring && "ring-2 ring-card",
        className,
      )}
    >
      {emoji ? <span className={size === "xl" ? "text-[34px]" : "text-[26px]"}>{emoji}</span> : initialOf(person.name)}
    </span>
  );
}

/** "Anyone" placeholder in avatar stacks: a "+" on the primary tint. */
export function AnyoneAvatar({ ring = false }: { ring?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[11px] font-bold text-soon-foreground",
        ring && "ring-2 ring-card",
      )}
    >
      +
    </span>
  );
}

/** Small avatar plus the person's name, as used in task rows. */
export function PersonTag({ person }: { person: { id: string; name: string; avatar?: string | null } }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[13px] text-secondary-foreground">
      <Avatar person={person} size="xs" />
      {person.name}
    </span>
  );
}
