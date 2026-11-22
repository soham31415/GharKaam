import { AppHeader } from "@/components/app-header";
import { requireProfile } from "@/lib/services/session";

/** Everything inside (app) needs an unlocked device and a picked profile. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireProfile();
  return (
    <>
      <AppHeader me={me} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-3">{children}</main>
    </>
  );
}
