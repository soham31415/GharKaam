import Link from "next/link";
import { AddCategoryForm, CategoryRow } from "@/components/inventory/category-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listCategories } from "@/lib/services/inventory";
import { requireProfile } from "@/lib/services/session";

export default async function CategoriesPage() {
  const me = await requireProfile();
  if (!me.isAdmin) {
    return (
      <>
        <h1 className="text-xl font-semibold">Categories</h1>
        <p className="text-muted-foreground">Only admin profiles can manage categories.</p>
        <Link href="/settings" className="underline">
          Back to settings
        </Link>
      </>
    );
  }
  const categories = await listCategories();
  return (
    <>
      <Link href="/settings" className="text-sm underline-offset-4 hover:underline">
        ← Settings
      </Link>
      <h1 className="text-xl font-semibold">Categories</h1>
      <Card>
        <CardHeader>
          <CardTitle>Add a category</CardTitle>
        </CardHeader>
        <CardContent>
          <AddCategoryForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Lower order numbers come first on the shopping list and inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? <p className="text-sm text-muted-foreground">No categories.</p> : null}
          <ul>
            {categories.map((c) => (
              <CategoryRow key={c.id} category={c} />
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
