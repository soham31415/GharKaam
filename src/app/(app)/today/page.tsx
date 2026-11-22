import { requireProfile } from "@/lib/services/session";

export default async function TodayPage() {
  const me = await requireProfile();
  return (
    <>
      <h1 className="text-xl font-semibold">Today</h1>
      <p className="text-muted-foreground">Hi {me.name}. Chores arrive in phase 2.</p>
    </>
  );
}
