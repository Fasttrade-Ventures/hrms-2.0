import { AssetCategoriesList } from "@/components/hr/organization/asset-categories";
import { requireRole } from "@/lib/auth/session";
import { listAssetCategories } from "@/lib/assets/categories";

export default async function AssetCategoriesPage() {
  await requireRole("hr_administrator");
  const categories = await listAssetCategories();
  return <AssetCategoriesList categories={categories} />;
}
