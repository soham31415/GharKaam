import Link from "next/link";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/today", label: "Today" },
  { href: "/chores", label: "Chores" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ me }: { me: Profile }) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-2 p-3">
        <Link href="/today" className="font-semibold">
          Gharkaam
        </Link>
        <Link href="/profiles" className="text-sm text-muted-foreground" title="Switch profile">
          {me.avatar} {me.name}
        </Link>
      </div>
      <nav className="mx-auto flex w-full max-w-2xl gap-4 overflow-x-auto px-3 pb-2 text-sm">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="underline-offset-4 hover:underline">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
