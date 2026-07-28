import { EmptyState, ListCard, StatCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import { getPlatformDashboardData } from "@/lib/platform/dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("platform_administrator");
  const data = await getPlatformDashboardData();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={
          data.deploymentMode === "standalone"
            ? "Standalone mode — single organization on this deployment."
            : "SaaS mode — tenant operations and health."
        }
        title="Platform administration"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          hint="Registered tenants"
          icon={<PortalIcon name="organization" />}
          label="Organizations"
          value={String(data.organizationCount)}
        />
        <StatCard
          hint="Current deployment"
          icon={<PortalIcon name="dashboard" />}
          label="Mode"
          value={data.deploymentMode}
        />
      </div>

      {data.deploymentMode === "standalone" ? (
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <EmptyState
            description="Platform admin tools for multi-tenant billing, provisioning, and cross-tenant support activate in SaaS deployment mode."
            title="Standalone deployment"
          />
        </div>
      ) : (
        <ListCard
          columns={[
            { key: "name", label: "Organization" },
            { key: "slug", label: "Slug", className: "w-40" },
            { key: "created", label: "Created", className: "w-36" },
          ]}
          empty={
            <EmptyState description="New tenant registrations will appear here." title="No organizations" />
          }
          header={<p className="text-sm font-medium text-[var(--foreground-primary)]">Tenants</p>}
          rows={data.organizations.map((org) => ({
            id: org.id,
            cells: {
              name: <span className="font-medium">{org.name}</span>,
              slug: <span className="text-sm text-[var(--foreground-secondary)]">{org.slug ?? "—"}</span>,
              created: (
                <span className="text-sm text-[var(--foreground-muted)]">
                  {new Date(org.createdAt).toLocaleDateString("en-MY")}
                </span>
              ),
            },
          }))}
        />
      )}
    </div>
  );
}
