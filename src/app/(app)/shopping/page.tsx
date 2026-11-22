import { HappyHouse } from "@/components/illustrations";
import { KeepAwake } from "@/components/inventory/keep-awake";
import { QuickAddForm, ShoppingList } from "@/components/inventory/shopping-list";
import { EmptyState } from "@/components/shell/grouped";
import { PageHeader } from "@/components/shell/page-header";
import { SHOPPING_LOOKAHEAD_DAYS } from "@/lib/config";
import { getShoppingList, listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";

export default async function ShoppingPage() {
  await requireProfile();
  const [list, categories] = await Promise.all([getShoppingList(), listCategories()]);

  return (
    <>
      <PageHeader
        eyebrow={<KeepAwake />}
        title={
          <>
            Shopping {list.count > 0 ? <span className="text-primary tabular-nums">{list.count}</span> : null}
          </>
        }
        subtitle={
          <span className="text-sm leading-[1.4]">
            Items marked running low, plus anything due to be restocked in the next {SHOPPING_LOOKAHEAD_DAYS} days.
          </span>
        }
      />
      <div className="-mt-1">
        <QuickAddForm categories={categories} />
      </div>
      {list.count === 0 ? (
        <EmptyState art={<HappyHouse />} title="Nothing to buy right now">
          Items show up here when someone marks them running low or they&apos;re due to be bought again.
        </EmptyState>
      ) : (
        <ShoppingList groups={list.groups} />
      )}
    </>
  );
}
