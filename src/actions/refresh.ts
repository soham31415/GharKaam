import { revalidatePath } from "next/cache";

/** Everything is per-family and small, so just refresh all pages after a change. */
export function refreshAll() {
  revalidatePath("/", "layout");
}
