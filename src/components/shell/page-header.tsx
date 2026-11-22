import { cn } from "cn";
import { ProfileButton } from "./profile-button";

/**
 * Large-title page header.
 * - `eyebrow` / `accessory`: the small row above the title (date, "screen stays on"…), with the
 *   profile avatar and any `actions` on the right.
 * - `trailing`: a button that sits level with the title instead (Chores "New", Inventory "Add item").
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  trailing,
  showProfile = true,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  trailing?: React.ReactNode;
  showProfile?: boolean;
  className?: string;
}) {
  const hasTopRow = eyebrow || actions || (showProfile && !trailing);
  return (
    <header className={cn("flex flex-col gap-0.5 px-1", className)}>
      {hasTopRow ? (
        <div className="flex min-h-9 items-center justify-between gap-3">
          <div className="min-w-0 text-[13px] font-semibold tracking-[0.4px] text-muted-foreground">{eyebrow}</div>
          <div className="flex items-center gap-2.5">
            {actions}
            {showProfile && !trailing ? <ProfileButton /> : null}
          </div>
        </div>
      ) : null}
      <div className="flex items-end justify-between gap-3">
        <h1 className={cn("title-large min-w-0 text-balance", hasTopRow && "mt-1")}>{title}</h1>
        {trailing ? <div className="mb-1 shrink-0">{trailing}</div> : null}
      </div>
      {subtitle ? <div className="text-[15px] leading-snug text-muted-foreground">{subtitle}</div> : null}
    </header>
  );
}
