import Link from "next/link";
import { LowToggleButton } from "@/components/inventory/item-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { countShoppingList, listInventory } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import type { ItemSummary } from "@/lib/types";

const TABS = [
  { key: "items", label: "Items", href: "/inventory" },
  { key: "archived", label: "Archived", href: "/inventory?filter=archived" },
] as const;

function statusVariant(item: ItemSummary): "destructive" | "secondary" | "outline" {
  if (item.archived) return "outline";
  if (item.isLow || item.isOverdue) return "destructive";
  return item.onShoppingList ? "secondary" : "outline";
}

export default async function InventoryPage({ searchParams }: PageProps<"/inventory">) {
  await requireProfile();
  const { filter } = await searchParams;
  const tab = filter === "archived" ? "archived" : "items";
  const [groups, shoppingCount] = await Promise.all([listInventory({ archived: tab === "archived" }), countShoppingList()]);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Inventory</h1>
        <div className="flex gap-2">
          <Link href="/shopping" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Shopping list ({shoppingCount})
          </Link>
          <Link href="/inventory/new" className={buttonVariants({ size: "sm" })}>
            Add item
          </Link>
        </div>
      </div>
      <nav className="flex gap-3 text-sm">
        {TABS.map((t) => (
          <Link key={t.key} href={t.href} className={t.key === tab ? "font-semibold underline underline-offset-4" : "underline-offset-4 hover:underline"}>
            {t.label}
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <p className="text-muted-foreground">{tab === "archived" ? "No archived items." : "No items yet. Add the things you buy regularly."}</p>
      ) : null}

      {groups.map((g) => (
        <section key={g.categoryId ?? "none"} className="flex flex-col gap-1">
          <h2 className="font-medium">{g.categoryName}</h2>
          <ul className="flex flex-col">
            {g.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <div className="flex flex-col">
                  <Link href={`/inventory/${item.id}`} className="underline-offset-4 hover:underline">
                    {item.name}
                    {item.quantityText ? <span className="text-muted-foreground"> · {item.quantityText}</span> : null}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {[item.lastBoughtText, item.isOneOff ? "one-off" : null].filter(Boolean).join(" · ") || "Never bought"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(item)}>{item.statusText}</Badge>
                  {!item.archived ? <LowToggleButton itemId={item.id} name={item.name} isLow={item.isLow} /> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
