import { QuickAddForm, ShoppingList } from "@/components/inventory/shopping-list";
import { Card, CardContent } from "@/components/ui/card";
import { SHOPPING_LOOKAHEAD_DAYS } from "@/lib/config";
import { getShoppingList, listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";

export default async function ShoppingPage() {
  await requireProfile();
  const [list, categories] = await Promise.all([getShoppingList(), listCategories()]);

  return (
    <>
      <h1 className="text-xl font-semibold">Shopping list ({list.count})</h1>
      <p className="text-sm text-muted-foreground">
        Items marked running low, plus anything due to be restocked in the next {SHOPPING_LOOKAHEAD_DAYS} days.
      </p>
      <Card size="sm">
        <CardContent>
          <QuickAddForm categories={categories} />
        </CardContent>
      </Card>
      {list.count === 0 ? <p className="text-muted-foreground">Nothing to buy right now.</p> : <ShoppingList groups={list.groups} />}
    </>
  );
}
