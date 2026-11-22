import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveItemButton, BoughtForm, LowToggleButton, NotNeededButton } from "@/components/inventory/item-actions";
import { ItemForm } from "@/components/inventory/item-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { today } from "@/lib/services/clock";
import { getItemDetail, listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";
import { uuid } from "@/lib/validation/form";

export default async function ItemPage({ params }: PageProps<"/inventory/[id]">) {
  const me = await requireProfile();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [item, categories] = await Promise.all([getItemDetail(id), listCategories()]);
  if (!item) notFound();

  return (
    <>
      <Link href="/inventory" className="text-sm underline-offset-4 hover:underline">
        ← Inventory
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          {item.name} {item.archived ? <Badge variant="outline">Archived</Badge> : null}
          {item.onShoppingList ? <Badge variant="secondary">On the shopping list</Badge> : null}
        </h1>
        <p className="text-sm text-muted-foreground">
          {item.categoryName}
          {item.quantityText ? ` · usually ${item.quantityText}` : ""}
        </p>
        <p className="text-sm text-muted-foreground">{item.scheduleText}</p>
        <p className="text-sm text-muted-foreground">
          {[item.statusText, item.lastBoughtText ?? "Never bought"].join(" · ")}
          {item.isLow && item.lowFlaggedByName ? ` (marked by ${item.lowFlaggedByName})` : ""}
        </p>
        {item.notes ? <p className="text-sm">{item.notes}</p> : null}
      </div>

      {!item.archived ? (
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
            <CardDescription>{item.onShoppingList ? item.shoppingReason : "Not on the shopping list."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <LowToggleButton itemId={item.id} name={item.name} isLow={item.isLow} />
              {item.onShoppingList ? <NotNeededButton itemId={item.id} name={item.name} /> : null}
            </div>
            <BoughtForm itemId={item.id} name={item.name} usualQuantity={item.form.usualQuantity} unit={item.form.unit} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {item.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {item.events.map((e) => (
                <li key={e.id}>
                  {e.text}
                  <span className="text-muted-foreground">
                    {" "}
                    · {e.byName ?? "someone"} · {e.atLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!item.archived ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit item</CardTitle>
            {item.isOneOff ? <CardDescription>Saving turns this one-off into a regular inventory item.</CardDescription> : null}
          </CardHeader>
          <CardContent>
            <ItemForm itemId={item.id} values={item.form} categories={categories} today={today()} />
          </CardContent>
        </Card>
      ) : null}

      {me.isAdmin ? <ArchiveItemButton itemId={item.id} archived={item.archived} /> : null}
    </>
  );
}
