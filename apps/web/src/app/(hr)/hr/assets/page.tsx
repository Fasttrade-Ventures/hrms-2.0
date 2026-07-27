import Link from "next/link";

import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { AssetRegisterFilters, AssetStatusBadge } from "@/components/hr/assets/asset-register-filters";
import { CreateAssetForm } from "@/components/hr/assets/create-asset-form";
import { ExportAssetsButton } from "@/components/hr/assets/export-assets-button";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAssetCategories } from "@/lib/assets/categories";
import { parseAssetRegisterFilters } from "@/lib/assets/parse-filters";
import { listAssets } from "@/lib/assets/queries";
import { listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { listBranches } from "@/lib/hr/organization";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  requireModule("assets");
  await requireRole("hr_administrator");

  const query = await searchParams;
  const filters = parseAssetRegisterFilters(query);

  const [assets, categories, branches, employees] = await Promise.all([
    listAssets(filters).catch(() => []),
    listAssetCategories({ activeOnly: true }).catch(() => []),
    listBranches().catch(() => []),
    listActiveEmployeesForSelect().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={<ExportAssetsButton />}
        description="Track company assets and assignments."
        title="Assets"
      />

      <AssetRegisterFilters
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        employees={employees}
        filters={filters}
      />

      <CreateAssetForm
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        categories={categories}
        employees={employees}
      />

      <ListCard
        columns={[
          { key: "name", label: "Asset" },
          { key: "category", label: "Category" },
          { key: "status", label: "Status", className: "w-28" },
          { key: "assignee", label: "Assigned to" },
          { key: "issued", label: "Issued", className: "w-32" },
        ]}
        empty={<EmptyState description="Assets you add will appear here." title="No assets" />}
        header={<p className="text-sm font-medium">Asset register</p>}
        rows={assets.map((asset) => ({
          id: asset.id,
          cells: {
            name: (
              <Link className="font-medium underline" href={`/hr/assets/${asset.id}`}>
                {asset.serialNumber ? `${asset.name} (${asset.serialNumber})` : asset.name}
              </Link>
            ),
            category: asset.categoryName,
            status: <AssetStatusBadge status={asset.status} />,
            assignee: asset.assigneeName ?? "Unassigned",
            issued: asset.assignedAt ? formatDate(asset.assignedAt) : "—",
          },
        }))}
      />
    </div>
  );
}
