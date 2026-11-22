import { SessionProvider } from "@/components/people/session-context";
import { RealtimeRefresher } from "@/components/realtime/realtime-refresher";
import { TabBar } from "@/components/shell/tab-bar";
import { countShoppingList } from "@/lib/services/inventory";
import { listPeople } from "@/lib/services/profiles";
import { requireProfile } from "@/lib/services/session";

/** Everything inside (app) needs an unlocked device and a picked profile. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireProfile();
  const [people, shoppingCount] = await Promise.all([listPeople(), countShoppingList()]);
  return (
    <SessionProvider me={me} people={people}>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-[22px] px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-[calc(var(--tabbar-h)+2rem)]">
        {children}
      </main>
      <TabBar shoppingCount={shoppingCount} />
      <RealtimeRefresher />
    </SessionProvider>
  );
}
