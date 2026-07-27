import { AssetCategoryForm } from "@/components/hr/organization/asset-categories";
import { requireRole } from "@/lib/auth/session";

export default async function CreateAssetCategoryPage() {
  await requireRole("hr_administrator");
  return <AssetCategoryForm />;
}
