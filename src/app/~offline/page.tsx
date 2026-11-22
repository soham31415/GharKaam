import type { Metadata } from "next";
import { HappyHouse } from "@/components/illustrations";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = { title: "Offline · Gharkaam" };

/**
 * Shown by the service worker (public/sw.js) when a page can't load because
 * the phone is offline. Static and public: it must work without a session.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <HappyHouse />
      <h1 className="font-heading text-[26px] font-black">You&apos;re offline</h1>
      <p className="text-[15px] leading-[1.45] text-muted-foreground">
        Gharkaam needs an internet connection to show and update chores and the shopping list. This page reloads by
        itself when you&apos;re back online.
      </p>
      <RetryButton />
    </main>
  );
}
