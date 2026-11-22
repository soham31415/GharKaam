"use client";

import Link from "next/link";
import { Avatar } from "@/components/people/avatar";
import { useSession } from "@/components/people/session-context";

/** The current profile's avatar, top right of each main screen. Tap to switch profile. */
export function ProfileButton() {
  const { me } = useSession();
  if (!me) return null;
  return (
    <Link
      href="/profiles"
      aria-label={`Switch profile. Using Gharkaam as ${me.name}`}
      className="pressable flex size-11 items-center justify-center rounded-full -m-1"
    >
      <Avatar person={me} size="md" showEmoji={false} />
    </Link>
  );
}
