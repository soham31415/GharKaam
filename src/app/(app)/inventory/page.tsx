import { Plus } from "lucide-react";
import Link from "next/link";
import { InventoryList } from "@/components/inventory/inventory-list";
import { PageHeader } from "@/components/shell/page-header";
import { listInventory } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import { parseInventoryFilter } from "@/lib/view/inventory";

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  await requireProfile();
  const { show } = await searchParams;
  const archived = show === "archived";
  const groups = await listInventory({ archived });

  return (
    <>
      <PageHeader
        title="Inventory"
        trailing={
          <Link
            href="/inventory/new"
            className="pressable inline-flex h-9 items-center gap-1 rounded-full bg-primary pr-3.5 pl-2.5 text-[15px] font-semibold text-primary-foreground"
          >
            <Plus aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
            Add item
          </Link>
        }
      />
      <InventoryList
        key={archived ? "archived" : "items"}
        groups={groups}
        archived={archived}
        initialFilter={parseInventoryFilter(show)}
      />
    </>
  );
}
