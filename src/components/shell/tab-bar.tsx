"use client";

import { cn } from "cn";
import { CircleEllipsis, House, Package, Repeat, ShoppingCart, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: LucideIcon; match: string[] };

const TABS: Tab[] = [
  { href: "/today", label: "Today", icon: House, match: ["/today"] },
  { href: "/chores", label: "Chores", icon: Repeat, match: ["/chores"] },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart, match: ["/shopping"] },
  { href: "/inventory", label: "Inventory", icon: Package, match: ["/inventory"] },
  { href: "/more", label: "More", icon: CircleEllipsis, match: ["/more", "/history", "/settings"] },
];

/** iOS-style bottom tab bar. Sits inside the centred content column on wide screens. */
export function TabBar({ shoppingCount }: { shoppingCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex h-(--tabbar-h) w-full max-w-2xl justify-around border-t border-bar-border bg-bar px-1.5 pt-[7px] pb-[max(env(safe-area-inset-bottom),10px)] backdrop-blur-xl backdrop-saturate-150"
    >
      {TABS.map((tab) => {
        const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
        const Icon = tab.icon;
        const badge = tab.href === "/shopping" && shoppingCount > 0 ? shoppingCount : null;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            aria-label={badge ? `${tab.label}, ${badge} item${badge === 1 ? "" : "s"}` : undefined}
            className={cn(
              "relative flex w-[68px] flex-col items-center gap-[3px] text-[10.5px] font-semibold",
              active ? "text-primary" : "text-[#6C6C70] dark:text-[#8E8E93]",
            )}
          >
            <Icon
              aria-hidden="true"
              className="size-[26px]"
              strokeWidth={active ? 2.2 : 1.8}
              fill={active && tab.href === "/today" ? "currentColor" : "none"}
            />
            {tab.label}
            {badge ? (
              <span
                aria-hidden="true"
                className="absolute -top-[3px] left-[40px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-[5px] text-[11px] font-bold text-primary-foreground tabular-nums"
              >
                {badge > 99 ? "99+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
