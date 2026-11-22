"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shown when a page or a button's server call fails unexpectedly, most often
 * because the phone lost its connection.
 */
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    console.error(error);
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [error]);

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-semibold">{offline ? "You're offline" : "Something went wrong"}</h1>
      <p className="text-muted-foreground">
        {offline
          ? "Reconnect to the internet and try again. If you had just tapped something, check whether it went through."
          : "That didn't work. Try again; if it keeps happening, reload the app."}
      </p>
      <div>
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </div>
  );
}
