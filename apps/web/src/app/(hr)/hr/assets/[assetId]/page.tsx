import { notFound } from "next/navigation";

import { AssetDetailView } from "@/components/hr/assets/asset-detail-view";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAssetCategories } from "@/lib/assets/categories";
import { getAssetDetail } from "@/lib/assets/queries";
import { listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  await requireModule("assets");
  await requireRole("hr_administrator");

  const { assetId } = await params;
  const [asset, categories, employees] = await Promise.all([
    getAssetDetail(assetId),
    listAssetCategories().catch(() => []),
    listActiveEmployeesForSelect().catch(() => []),
  ]);

  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/assets" variant="outline">
            Back to register
          </HrLinkButton>
        }
        description={[asset.categoryName, asset.serialNumber].filter(Boolean).join(" · ")}
        title={asset.name}
      />
      <AssetDetailView
        asset={asset}
        categories={categories}
        employees={employees}
      />
    </div>
  );
}
