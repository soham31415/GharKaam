"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Reloads the page now, and automatically when the connection comes back. */
export function RetryButton({ label = "Try again" }: { label?: string }) {
  useEffect(() => {
    const reload = () => window.location.reload();
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
  }, []);
  return (
    <div>
      <Button onClick={() => window.location.reload()}>{label}</Button>
    </div>
  );
}
