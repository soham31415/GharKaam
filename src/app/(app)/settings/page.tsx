import Link from "next/link";
import { lockDeviceAction, switchProfileAction } from "@/actions/session";
import { SubmitButton } from "@/components/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireProfile } from "@/lib/services/session";

export default async function SettingsPage() {
  const me = await requireProfile();
  return (
    <>
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {me.avatar} {me.name}
          </CardTitle>
          <CardDescription>{me.isAdmin ? "Admin profile" : "Member profile"}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={switchProfileAction}>
            <SubmitButton variant="outline">Switch profile</SubmitButton>
          </form>
          {me.isAdmin ? (
            <Link href="/settings/profiles" className={buttonVariants({ variant: "outline" })}>
              Manage profiles
            </Link>
          ) : null}
          {me.isAdmin ? (
            <Link href="/settings/categories" className={buttonVariants({ variant: "outline" })}>
              Shopping categories
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>This device</CardTitle>
          <CardDescription>Locking asks for the family passcode again on this device only.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={lockDeviceAction}>
            <SubmitButton variant="destructive">Lock this device</SubmitButton>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
