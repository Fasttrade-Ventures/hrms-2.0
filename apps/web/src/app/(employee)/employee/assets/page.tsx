import Link from "next/link";

import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listMyAssets } from "@/lib/assets/queries";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireModule("assets");
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
        empty={
          <EmptyState
            description="Assigned assets will appear here."
            icon={<PortalIcon name="assets" className="h-6 w-6" />}
            title="No assets assigned"
          />
        }
        header={<p className="text-sm font-medium">Assigned assets</p>}
        rows={assets.map((asset) => ({
          id: asset.id,
          cells: {
            name: (
              <Link className="block underline" href={`/employee/assets/${asset.id}`}>
                <p className="font-medium">{asset.name}</p>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {asset.categoryName}
                  {!asset.acknowledgedAt ? " · Acknowledgement pending" : ""}
                  {asset.hasOpenRequest ? " · Request pending" : ""}
                </p>
              </Link>
            ),
            serial: asset.serialNumber ?? "—",
            issued: formatDate(asset.assignedAt),
          },
        }))}
      />
    </div>
  );
}
