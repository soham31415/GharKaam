import Link from "next/link";
import { ChoreForm } from "@/components/chores/chore-form";
import { today } from "@/lib/services/clock";
import { requireProfile } from "@/lib/services/session";

/** Direct link to the form (the app normally opens it as a sheet from Today or Chores). */
export default async function NewChorePage() {
  await requireProfile();
  return (
    <>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center">
        <Link href="/chores" className="justify-self-start px-1 py-2 text-[17px] text-primary">
          Cancel
        </Link>
        <h1 className="text-[17px] font-bold">New chore</h1>
        <button type="submit" form="chore-form" className="pressable justify-self-end px-1 py-2 text-[17px] font-bold text-primary">
          Create
        </button>
      </div>
      <ChoreForm today={today()} formId="chore-form" />
    </>
  );
}
