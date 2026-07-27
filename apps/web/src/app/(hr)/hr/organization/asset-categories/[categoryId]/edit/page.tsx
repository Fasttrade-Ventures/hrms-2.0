import { notFound } from "next/navigation";

import { AssetCategoryForm } from "@/components/hr/organization/asset-categories";
import { requireRole } from "@/lib/auth/session";
import { getAssetCategory } from "@/lib/assets/categories";

export default async function EditAssetCategoryPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  await requireRole("hr_administrator");
  const { categoryId } = await params;
  const category = await getAssetCategory(categoryId);
  if (!category) notFound();
  return <AssetCategoryForm category={category} />;
}
