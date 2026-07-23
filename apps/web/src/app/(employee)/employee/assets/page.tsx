import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listMyAssets } from "@/lib/employee/catalog";

export default async function Page() {
  const assets = await listMyAssets();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Company assets assigned to you." title="My assets" />

      <ListCard
        columns={[
          { key: "name", label: "Asset" },
          { key: "serial", label: "Serial", className: "hidden md:block flex-1" },
          { key: "issued", label: "Issued", className: "w-32" },
        ]}
        empty={<EmptyState description="Assigned assets will appear here." title="No assets assigned" />}
        header={<p className="text-sm font-medium">Assigned assets</p>}
        rows={assets.map((asset) => ({
          id: asset.id,
          cells: {
            name: (
              <div>
                <p className="font-medium">{asset.name}</p>
                <p className="text-sm text-[var(--foreground-muted)]">{asset.category ?? "—"}</p>
              </div>
            ),
            serial: asset.serial_number ?? "—",
            issued: asset.issued_at ? formatDate(asset.issued_at) : "—",
          },
        }))}
      />
    </div>
  );
}
