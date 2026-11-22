import { ChoreForm } from "@/components/chores/chore-form";
import { today } from "@/lib/services/clock";
import { listPeople } from "@/lib/services/profiles";
import { requireProfile } from "@/lib/services/session";

export default async function NewChorePage() {
  const me = await requireProfile();
  const people = await listPeople();
  return (
    <>
      <h1 className="text-xl font-semibold">New chore</h1>
      <ChoreForm people={people} today={today()} meId={me.id} />
    </>
  );
}
