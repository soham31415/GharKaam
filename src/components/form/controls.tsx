"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { formatDate, type DateStr } from "@/lib/domain/dates";

/**
 * iOS segmented control. The white "thumb" slides between options
 * (transform only, 200ms ease-out), so the change of selection is easy to follow.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  role = "radiogroup",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  role?: "radiogroup" | "tablist";
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <SegmentedFrame count={options.length} index={index} label={label} role={role} className={className}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role={role === "radiogroup" ? "radio" : "tab"}
            aria-checked={role === "radiogroup" ? on : undefined}
            aria-selected={role === "tablist" ? on : undefined}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 h-[34px] rounded-lg text-sm transition-[font-weight] duration-150",
              on ? "font-semibold" : "font-medium",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </SegmentedFrame>
  );
}

/** Segmented control whose options are links (server-side filters). The thumb moves on tap, before the page loads. */
export function SegmentedLinks({
  options,
  value,
  label,
}: {
  options: { value: string; label: string; href: string }[];
  value: string;
  label: string;
}) {
  const [picked, setPicked] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setPicked(value);
  }
  const index = Math.max(0, options.findIndex((o) => o.value === picked));
  return (
    <SegmentedFrame count={options.length} index={index} label={label} role="tablist">
      {options.map((o) => {
        const on = o.value === picked;
        return (
          <Link
            key={o.value}
            href={o.href}
            role="tab"
            aria-selected={on}
            scroll={false}
            onClick={() => setPicked(o.value)}
            className={cn("relative z-10 flex h-8 items-center justify-center rounded-lg text-sm", on ? "font-semibold" : "font-medium")}
          >
            {o.label}
          </Link>
        );
      })}
    </SegmentedFrame>
  );
}

function SegmentedFrame({
  count,
  index,
  label,
  role,
  className,
  children,
}: {
  count: number;
  index: number;
  label: string;
  role: "radiogroup" | "tablist";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={role}
      aria-label={label}
      className={cn("relative grid gap-0.5 rounded-[10px] bg-fill p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 rounded-lg bg-fill-selected shadow-[0_1px_3px_rgb(0_0_0/0.12)] transition-transform duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `calc((100% - 4px - ${(count - 1) * 2}px) / ${count})`,
          transform: `translateX(calc(${index * 100}% + ${index * 2}px))`,
        }}
      />
      {children}
    </div>
  );
}

/**
 * A date shown as a grey pill ("Sun 22 Nov"); tapping it opens the phone's
 * native date picker. Optional "×" to clear (for "Ends: Never").
 */
export function DatePill({
  value,
  onChange,
  today,
  label,
  placeholder = "Pick a date",
  clearable = false,
  min,
}: {
  value: DateStr;
  onChange: (value: DateStr) => void;
  today: DateStr;
  label: string;
  placeholder?: string;
  clearable?: boolean;
  min?: DateStr;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="flex items-center gap-1">
      <span className="relative inline-flex">
        <span
          className={cn(
            "pointer-events-none rounded-pill px-2.5 py-[5px] text-[15px] font-semibold",
            value ? "bg-neutral text-foreground" : "text-muted-foreground",
          )}
        >
          {value ? formatDate(value, today) : placeholder}
        </span>
        <input
          ref={ref}
          type="date"
          aria-label={label}
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={() => {
            try {
              ref.current?.showPicker?.();
            } catch {
              // Older browsers: the input opens its own picker.
            }
          }}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </span>
      {clearable && value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="pressable flex size-8 items-center justify-center rounded-full text-tertiary"
        >
          <X className="size-4" strokeWidth={2.6} />
        </button>
      ) : null}
    </span>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <span role="alert" className="text-[13px] font-semibold text-danger-foreground dark:text-destructive">
      {children}
    </span>
  );
}
