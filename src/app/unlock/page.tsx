import { redirect } from "next/navigation";
import { UnlockForm } from "@/components/session/unlock-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDeviceUnlocked } from "@/lib/services/session";

export default async function UnlockPage({ searchParams }: PageProps<"/unlock">) {
  if (await isDeviceUnlocked()) redirect("/profiles");
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>Gharkaam</CardTitle>
          <CardDescription>Enter the family passcode. This device will remember it.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnlockForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Just added Gharkaam to your iPhone home screen? It keeps its own storage, so enter the passcode once more here.
      </p>
    </main>
  );
}
