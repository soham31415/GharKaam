"use client";

import { createContext, useContext, useMemo } from "react";
import type { PersonRef, Profile } from "@/lib/types";

type Session = { me: Profile | null; people: PersonRef[]; familyOrder: string[] };

const SessionContext = createContext<Session>({ me: null, people: [], familyOrder: [] });

/** Who is using the app and the family list (in family order, for avatar colours). */
export function SessionProvider({
  me,
  people,
  children,
}: {
  me: Profile | null;
  people: PersonRef[];
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ me, people, familyOrder: people.map((p) => p.id) }), [me, people]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  return useContext(SessionContext);
}
