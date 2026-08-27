import { EmptyState, ListCard, StatCard } from "@hrms/ui";
import { runHealthChecks } from "@hrms/platform";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import { getPlatformDashboardData } from "@/lib/platform/dashboard";
import { requireRole } from "@/lib/auth/session";

function statusLabel(ok: boolean): string {
  return ok ? "OK" : "Check";
}

export default async function Page() {
  await requireRole("platform_administrator");
  const [data, health] = await Promise.all([getPlatformDashboardData(), runHealthChecks()]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={
          data.deploymentMode === "standalone"
            ? "Standalone mode — deployment health and single-organization ops."
            : "SaaS mode — tenant operations and deployment health."
        }
        title="Platform administration"
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          hint="/api/health overall"
          icon={<PortalIcon name="dashboard" />}
          label="Health"
          value={statusLabel(health.ok)}
        />
        <StatCard
          hint="Pending notification outbox"
          icon={<PortalIcon name="notifications" />}
          label="Outbox pending"
          value={
            health.ops.notificationOutboxPending == null
              ? "—"
              : String(health.ops.notificationOutboxPending)
          }
        />
      </div>

      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)]">
        <div className="border-b border-[var(--border-primary)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--foreground-primary)]">Service checks</p>
          <p className="text-xs text-[var(--foreground-muted)]">
            Same probes as <code className="text-[11px]">GET /api/health</code>
          </p>
        </div>
        <div className="divide-y divide-[var(--border-primary)]">
          {(
            [
              ["Supabase", health.services.supabase],
              ["R2 storage", health.services.r2],
              ["Resend mail", health.services.resend],
              ["Ops queues", { ok: health.ops.ok, message: health.ops.message }],
            ] as const
          ).map(([label, service]) => (
            <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm" key={label}>
              <div>
                <p className="font-medium">{label}</p>
                {service.message ? (
                  <p className="text-xs text-[var(--foreground-muted)]">{service.message}</p>
                ) : null}
              </div>
              <span
                className={
                  service.ok
                    ? "text-xs font-semibold text-emerald-700"
                    : "text-xs font-semibold text-amber-800"
                }
              >
                {statusLabel(service.ok)}
              </span>
            </div>
          ))}
        </div>
        {health.ops.webhookOutboxPending != null ? (
          <p className="border-t border-[var(--border-primary)] px-4 py-2 text-xs text-[var(--foreground-muted)]">
            Webhook outbox pending: {health.ops.webhookOutboxPending}
          </p>
        ) : null}
      </div>

      {data.deploymentMode === "standalone" ? (
        <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <EmptyState
            description="Multi-tenant provisioning and impersonation stay SaaS-only. Use this dashboard for deployment health in standalone."
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
