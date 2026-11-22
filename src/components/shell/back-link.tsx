import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** iOS-style "‹ Chores" back link at the top of detail screens. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-mb-3 -ml-1.5 inline-flex min-h-11 items-center gap-0.5 self-start text-[17px] text-primary">
      <ChevronLeft aria-hidden="true" className="size-6" strokeWidth={2.4} />
      {children}
    </Link>
  );
}
