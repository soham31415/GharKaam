import { redirect } from "next/navigation";
import { AppMark } from "@/components/illustrations";
import { UnlockForm } from "@/components/session/unlock-form";
import { isDeviceUnlocked } from "@/lib/services/session";

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  if (await isDeviceUnlocked()) redirect("/profiles");
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-4 pt-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <AppMark size={88} />
        <h1 className="font-heading text-[40px] leading-none font-black tracking-[-0.5px]">
          Ghar<span className="text-primary">kaam</span>
        </h1>
        <p className="text-[15px] text-muted-foreground">Enter the family passcode. This device will remember it.</p>
      </div>
      <div className="rounded-card bg-card p-4">
        <UnlockForm next={typeof next === "string" ? next : undefined} />
      </div>
      <p className="text-center text-xs leading-snug text-muted-foreground">
        Just added Gharkaam to your iPhone home screen? It keeps its own storage, so enter the passcode once more here.
      </p>
    </main>
  );
}
