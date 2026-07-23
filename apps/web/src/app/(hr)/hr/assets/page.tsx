import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { CreateAssetForm } from "@/components/hr/create-asset-form";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listAssets } from "@/lib/hr/assets";
import { listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  const [assets, employees] = await Promise.all([
    listAssets().catch(() => []),
    listActiveEmployeesForSelect().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader description="Track company assets and assignments." title="Assets" />

      <PortalSectionCard description="Track laptops, phones, and other company equipment." title="Add asset">
        <CreateAssetForm employees={employees} />
      </PortalSectionCard>

      <ListCard
        columns={[
          { key: "name", label: "Asset" },
          { key: "category", label: "Category" },
          { key: "assignee", label: "Assigned to" },
          { key: "issued", label: "Issued", className: "w-32" },
        ]}
        empty={<EmptyState description="Assets you add will appear here." title="No assets" />}
        header={<p className="text-sm font-medium">Asset register</p>}
        rows={assets.map((asset) => ({
          id: asset.id,
          cells: {
            name: asset.serialNumber ? `${asset.name} (${asset.serialNumber})` : asset.name,
            category: asset.category ?? "—",
            assignee: asset.assigneeName ?? "Unassigned",
            issued: asset.issuedAt ? formatDate(asset.issuedAt) : "—",
          },
        }))}
      />
    </div>
  );
}
