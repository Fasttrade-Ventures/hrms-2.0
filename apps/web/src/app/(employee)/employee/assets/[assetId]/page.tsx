import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { EmployeeAssetDetail } from "@/components/employee/assets/employee-asset-detail";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getMyAssetDetail } from "@/lib/assets/queries";
import { requireModule } from "@/lib/entitlements";

export default async function EmployeeAssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  requireModule("assets");
  const { assetId } = await params;
  const asset = await getMyAssetDetail(assetId);
  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Assigned company asset." title={asset.name} />
      <EmployeeAssetDetail asset={asset} />
    </div>
  );
}
