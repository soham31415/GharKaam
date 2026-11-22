"use client";

import { Sun } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Keeps the screen on while the shopping list is open (Screen Wake Lock API),
 * and says so. Browsers release the lock when the app goes to the background,
 * so it's taken again on return. Renders nothing where unsupported.
 */
export function KeepAwake() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) {
          void next.release();
          return;
        }
        lock = next;
        setActive(true);
        next.addEventListener("release", () => setActive(false));
      } catch {
        setActive(false); // e.g. battery saver, or the page isn't visible
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && (!lock || lock.released)) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, []);

  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold tracking-normal text-done dark:text-done">
      <Sun aria-hidden="true" className="size-3.5" strokeWidth={2.4} />
      Screen stays on while shopping
    </span>
  );
}
