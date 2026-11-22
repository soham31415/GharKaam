import { cn } from "cn";

/**
 * iOS "grouped list" building blocks: a section label above a white card whose
 * rows are split by hairlines.
 */

export function Section({
  label,
  labelClassName,
  footer,
  className,
  children,
  ...props
}: {
  label?: React.ReactNode;
  labelClassName?: string;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"section">, "children">) {
  return (
    <section className={cn("flex flex-col gap-[7px]", className)} {...props}>
      {label ? <h2 className={cn("section-label px-4", labelClassName)}>{label}</h2> : null}
      {children}
      {footer ? <div className="px-4 pt-0.5 text-[12.5px] leading-snug text-muted-foreground">{footer}</div> : null}
    </section>
  );
}

/** White rounded card; direct children are rows separated by 1px lines. */
export function GroupCard({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-card bg-card [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-separator",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Small rounded status pill: due soon / overdue / done / neutral. */
export function Pill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "soon" | "danger" | "done" | "neutral";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill py-0.5 pr-2 pl-2 text-[12.5px] font-semibold whitespace-nowrap has-[svg]:pl-1.5 [&_svg]:size-3 [&_svg]:shrink-0",
        tone === "soon" && "bg-soon text-soon-foreground",
        tone === "danger" && "bg-danger text-danger-foreground",
        tone === "done" && "bg-done-tint text-done-foreground",
        tone === "neutral" && "bg-neutral text-neutral-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Empty state: illustration, Nunito heading, one line of text. */
export function EmptyState({
  art,
  title,
  children,
  card = false,
}: {
  art?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  card?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center",
        card ? "rounded-3xl bg-card px-5 pt-7 pb-6" : "px-5 py-10",
      )}
    >
      {art}
      <p className="font-heading text-[22px] font-black">{title}</p>
      {children ? <div className="max-w-[290px] text-[15px] leading-[1.45] text-muted-foreground">{children}</div> : null}
    </div>
  );
}
