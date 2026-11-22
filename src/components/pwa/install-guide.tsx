"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AppMark } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { detectPlatform, getInstallPrompt, isStandalone, onInstallPromptChange, setInstallPrompt, type Platform } from "./pwa-state";

type Env = { platform: Platform; standalone: boolean };

const noSubscribe = () => () => {};
function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** Platform and install state only exist in the browser; null during server rendering. */
function useEnv(): Env | null {
  const standalone = useSyncExternalStore<boolean | null>(subscribeStandalone, isStandalone, () => null);
  const platform = useSyncExternalStore<Platform | null>(noSubscribe, detectPlatform, () => null);
  return standalone === null || platform === null ? null : { platform, standalone };
}

function useInstallPrompt() {
  return useSyncExternalStore(onInstallPromptChange, getInstallPrompt, () => null);
}

function IPhoneSteps() {
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
      <li>Open this page in <strong>Safari</strong> (other browsers on iPhone can&apos;t install apps on iOS 16.3 and older).</li>
      <li>
        Tap the <strong>Share</strong> button (the square with an arrow pointing up) at the bottom of the screen, or in
        the address bar on iPad.
      </li>
      <li>
        Scroll down and tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
      </li>
      <li>Open Gharkaam from your home screen.</li>
      <li>
        Enter the family passcode once more and pick your profile. The home-screen app keeps its own storage, separate
        from Safari.
      </li>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
      <li>Open this page in <strong>Chrome</strong>.</li>
      <li>
        Tap the <strong>⋮</strong> menu (top right), then <strong>Add to Home screen</strong> or{" "}
        <strong>Install app</strong>.
      </li>
      <li>
        Tap <strong>Install</strong>. Gharkaam appears with your other apps.
      </li>
    </ol>
  );
}

export function InstallGuide() {
  const env = useEnv();
  const prompt = useInstallPrompt();
  const [outcome, setOutcome] = useState<string | null>(null);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setInstallPrompt(null); // a prompt can only be used once
    setOutcome(choice.outcome === "accepted" ? "Installing… look for Gharkaam on your home screen." : "Not installed.");
  };

  if (!env) return null;

  if (env.standalone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>You&apos;re using the installed app</CardTitle>
          <CardDescription>Nothing else to do here. Notifications can be turned on in Settings.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sections: { key: Platform; title: string; body: React.ReactNode }[] = [
    { key: "ios", title: "iPhone / iPad", body: <IPhoneSteps /> },
    { key: "android", title: "Android", body: <AndroidSteps /> },
  ];
  // Show the current platform's steps first and open; the other one collapsed.
  sections.sort((a, b) => Number(b.key === env.platform) - Number(a.key === env.platform));

  return (
    <>
      {prompt ? (
        <Card>
          <CardHeader>
            <CardTitle>Install with one tap</CardTitle>
            <CardDescription>Your browser can install Gharkaam directly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button onClick={install}>Install Gharkaam</Button>
          </CardContent>
        </Card>
      ) : null}
      {outcome ? <p className="text-sm text-muted-foreground">{outcome}</p> : null}

      {sections.map((s) => (
        <Card key={s.key}>
          <CardContent>
            <details open={s.key === env.platform || env.platform === "other"}>
              <summary className="cursor-pointer font-medium">{s.title}</summary>
              <div className="pt-3">{s.body}</div>
            </details>
          </CardContent>
        </Card>
      ))}

      <p className="text-sm text-muted-foreground">
        On a computer, Chrome and Edge show an install icon at the right end of the address bar.{" "}
        <Link href="/today" className="underline">
          Back to Today
        </Link>
      </p>
    </>
  );
}

/** One-line status for Settings: "Installed app" / "In the browser". */
export function InstallStatus() {
  const env = useEnv();
  if (!env) return null;
  return (
    <span className="text-sm text-muted-foreground">
      {env.standalone ? "You're using the installed app." : "You're using the browser, not the installed app."}
    </span>
  );
}

const HINT_KEY = "gharkaam:install-hint-dismissed";
const hintListeners = new Set<() => void>();
function subscribeHint(onChange: () => void) {
  hintListeners.add(onChange);
  return () => hintListeners.delete(onChange);
}
let dismissedThisSession = false;
function hintDismissed(): boolean {
  if (dismissedThisSession) return true;
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false; // storage blocked (private mode): just show it
  }
}
function dismissHint() {
  try {
    localStorage.setItem(HINT_KEY, "1");
  } catch {
    // storage blocked: hidden until the page reloads
  }
  dismissedThisSession = true;
  hintListeners.forEach((l) => l());
}

/** Small "install me" hint on Today, for phones that haven't installed the app. Dismissable. */
export function InstallHint() {
  const env = useEnv();
  const dismissed = useSyncExternalStore(subscribeHint, () => hintDismissed(), () => true);
  if (!env || env.standalone || env.platform === "other" || dismissed) return null;
  return (
    <div className="flex items-center gap-3 rounded-card bg-card px-3.5 py-3">
      <AppMark size={40} className="shrink-0" />
      <span className="min-w-0 flex-1 text-sm leading-snug">
        Add Gharkaam to your home screen for a full-screen app{env.platform === "ios" ? " and notifications" : ""}.
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <Link href="/settings/install" className="pressable rounded-full bg-primary-tint px-3 py-1.5 text-sm font-semibold text-primary">
          How?
        </Link>
        <button type="button" onClick={dismissHint} className="pressable rounded-full px-2.5 py-1.5 text-sm font-semibold text-muted-foreground">
          Hide
        </button>
      </span>
    </div>
  );
}
