import Link from "next/link";
import { ItemForm } from "@/components/inventory/item-form";
import { today } from "@/lib/services/clock";
import { listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";

export default async function NewItemPage() {
  await requireProfile();
  const categories = await listCategories();
  return (
    <>
      <Link href="/inventory" className="text-sm underline-offset-4 hover:underline">
        ← Inventory
      </Link>
      <h1 className="text-xl font-semibold">Add item</h1>
      <p className="text-sm text-muted-foreground">After saving, the form stays open so you can add the next item.</p>
      <ItemForm categories={categories} today={today()} />
    </>
  );
}
