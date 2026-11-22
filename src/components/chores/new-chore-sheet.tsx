"use client";

import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { DateStr } from "@/lib/domain/dates";
import type { ChoreFormValues } from "@/lib/types";
import { ChoreForm } from "./chore-form";

/**
 * The chore form as an iOS-style bottom sheet: grab handle, Cancel / title /
 * Create across the top, the form scrolling underneath. Swipe down to dismiss.
 */
function ChoreSheet({
  open,
  onOpenChange,
  trigger,
  title,
  submitLabel,
  children,
  formId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactElement;
  title: string;
  submitLabel: string;
  formId: string;
  children: React.ReactNode;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger render={trigger} />
      <DrawerContent
        className="mx-auto max-w-2xl rounded-t-[14px] border-t-0 bg-background"
        style={{ "--drawer-content-max-height": "calc(100dvh - env(safe-area-inset-top) - 12px)" } as React.CSSProperties}
      >
        <div className="flex shrink-0 flex-col items-center gap-1 px-4 pt-2">
          <span aria-hidden="true" className="h-[5px] w-[38px] rounded-full bg-[#C7C7CC] dark:bg-[#48484A]" />
          <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center">
            <DrawerClose className="pressable justify-self-start px-1 py-2 text-[17px] text-primary">Cancel</DrawerClose>
            <DrawerTitle className="text-[17px] font-bold">{title}</DrawerTitle>
            <button type="submit" form={formId} className="pressable justify-self-end px-1 py-2 text-[17px] font-bold text-primary">
              {submitLabel}
            </button>
          </div>
          <DrawerDescription className="sr-only">Set the name, how often it repeats and who does it.</DrawerDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/** "New chore": a round + (Today) or a "New" pill (Chores) that opens the sheet. */
export function NewChoreSheet({ today, trigger = "button" }: { today: DateStr; trigger?: "icon" | "button" }) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  const button =
    trigger === "icon" ? (
      <button
        type="button"
        aria-label="New chore"
        className="pressable flex size-9 items-center justify-center rounded-full bg-primary-tint text-primary"
      >
        <Plus aria-hidden="true" className="size-5" strokeWidth={2.4} />
      </button>
    ) : (
      <button
        type="button"
        className="pressable inline-flex h-9 items-center gap-1 rounded-full bg-primary pr-3.5 pl-2.5 text-[15px] font-semibold text-primary-foreground"
      >
        <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
        New
      </button>
    );
  return (
    <ChoreSheet open={open} onOpenChange={setOpen} trigger={button} title="New chore" submitLabel="Create" formId={formId}>
      {/* Creating navigates to the new chore's page, which closes the sheet. */}
      <ChoreForm today={today} formId={formId} />
    </ChoreSheet>
  );
}

/** "Edit chore" on a chore's page: the same sheet, pre-filled; closes with a "Saved." toast. */
export function EditChoreSheet({
  choreId,
  title,
  values,
  today,
}: {
  choreId: string;
  title: string;
  values: ChoreFormValues;
  today: DateStr;
}) {
  const [open, setOpen] = useState(false);
  const formId = useId();
  return (
    <ChoreSheet
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button type="button" className="pressable h-9 rounded-full bg-primary-tint px-3.5 text-[15px] font-semibold text-primary">
          Edit
        </button>
      }
      title="Edit chore"
      submitLabel="Save"
      formId={formId}
    >
      <ChoreForm
        choreId={choreId}
        values={values}
        today={today}
        formId={formId}
        onSaved={() => {
          setOpen(false);
          toast.success(`${title}: Saved.`);
        }}
      />
    </ChoreSheet>
  );
}
