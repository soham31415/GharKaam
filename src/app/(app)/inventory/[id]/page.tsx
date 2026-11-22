import { ShoppingCart } from "lucide-react";
import { notFound } from "next/navigation";
import { ArchiveItemButton, BoughtForm, LowToggleButton, NotNeededButton } from "@/components/inventory/item-actions";
import { ItemForm } from "@/components/inventory/item-form";
import { BackLink } from "@/components/shell/back-link";
import { GroupCard, Pill, Section } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
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
  const tone = item.isLow || item.isOverdue ? "danger" : item.onShoppingList ? "soon" : "neutral";

  return (
    <>
      <BackLink href="/inventory">Inventory</BackLink>
      <PageHeader
        title={item.name}
        showProfile={false}
        subtitle={
          <span className="mt-1 flex flex-wrap gap-1.5">
            <Pill tone={tone}>
              {item.onShoppingList ? <ShoppingCart aria-hidden="true" strokeWidth={2.6} /> : null}
              {item.statusText}
            </Pill>
            {item.archived ? <Pill>Archived</Pill> : null}
          </span>
        }
      />

      <GroupCard>
        <p className="px-4 py-3 text-base">
          {item.categoryName}
          {item.quantityText ? <span className="text-muted-foreground"> · usually {item.quantityText}</span> : null}
        </p>
        <p className="px-4 py-3 text-[15px] text-secondary-foreground">{item.scheduleText}</p>
        <p className="px-4 py-3 text-[15px] text-secondary-foreground">
          {item.lastBoughtText ?? "Never bought"}
          {item.isLow && item.lowFlaggedByName ? ` · marked running low by ${item.lowFlaggedByName}` : ""}
        </p>
        {item.notes ? <p className="px-4 py-3 text-[15px]">{item.notes}</p> : null}
      </GroupCard>

      {!item.archived ? (
        <Section label="Stock">
          <GroupCard>
            <div className="flex flex-col gap-3 p-4">
              <p className="text-[15px] text-secondary-foreground">
                {item.onShoppingList ? item.shoppingReason : "Not on the shopping list."}
              </p>
              <div className="flex flex-wrap gap-2">
                <LowToggleButton itemId={item.id} name={item.name} isLow={item.isLow} />
                {item.onShoppingList ? <NotNeededButton itemId={item.id} name={item.name} /> : null}
              </div>
            </div>
            <div className="p-4">
              <BoughtForm itemId={item.id} name={item.name} usualQuantity={item.form.usualQuantity} unit={item.form.unit} />
            </div>
          </GroupCard>
        </Section>
      ) : null}

      <Section label="History">
        <GroupCard>
          {item.events.length === 0 ? (
            <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Nothing yet.</p>
          ) : (
            item.events.map((e) => (
              <div key={e.id} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="text-base">{e.text}</span>
                <span className="text-[13px] text-muted-foreground">
                  {e.byName ?? "someone"} · {e.atLabel}
                </span>
              </div>
            ))
          )}
        </GroupCard>
      </Section>

      {!item.archived ? (
        <Section
          label="Edit item"
          footer={item.isOneOff ? "Saving turns this one-off into a regular inventory item." : undefined}
        >
          <div className="rounded-card bg-card p-4">
            <ItemForm itemId={item.id} values={item.form} categories={categories} today={today()} />
          </div>
        </Section>
      ) : null}

      {me.isAdmin ? <ArchiveItemButton itemId={item.id} archived={item.archived} /> : null}
    </>
  );
}
