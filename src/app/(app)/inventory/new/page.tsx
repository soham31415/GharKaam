import { BackLink } from "@/components/shell/back-link";
import { PageHeader } from "@/components/shell/page-header";
import { ItemForm } from "@/components/inventory/item-form";
import { today } from "@/lib/services/clock";
import { listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";

export default async function NewItemPage() {
  await requireProfile();
  const categories = await listCategories();
  return (
    <>
      <BackLink href="/inventory">Inventory</BackLink>
      <PageHeader title="Add item" showProfile={false} subtitle="After saving, the form stays open so you can add the next item." />
      <div className="rounded-card bg-card p-4">
        <ItemForm categories={categories} today={today()} />
      </div>
    </>
  );
}
