"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { REALTIME_CHANNEL } from "@/lib/config";

/**
 * Keeps every open phone up to date. The database broadcasts a data-less
 * "changed" ping after any write; on a ping (or when the app comes back to the
 * foreground / back online) we re-fetch the current page from our own server.
 * Renders nothing.
 */
export function RealtimeRefresher() {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 300); // collapse bursts of pings
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refresh);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const supabase =
      url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
    const channel = supabase
      ?.channel(REALTIME_CHANNEL, { config: { private: false } })
      .on("broadcast", { event: "changed" }, refresh)
      .subscribe();

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refresh);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
