import Link from "next/link";

import { ListCard, StatCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import { greetingForHour } from "@/lib/employees/self";
import { getOwnerDashboardData } from "@/lib/owner/dashboard";
import { requireRole } from "@/lib/auth/session";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export default async function Page() {
  await requireRole("organization_owner");
  const organizationId = getOrganizationId();
  const data = await getOwnerDashboardData(organizationId);
  const hour = new Date().getHours();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${data.deploymentMode} deployment · module entitlements and organization health`}
        title={`${greetingForHour(hour)}, Owner`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          hint="Active headcount"
          icon={<PortalIcon name="employees" />}
          label="Employees"
          value={String(data.employeeCount)}
        />
        <StatCard
          hint="Locations"
          icon={<PortalIcon name="organization" />}
          label="Branches"
          value={String(data.branchCount)}
        />
        <StatCard
          hint="Draft or in workflow"
          icon={<PortalIcon name="payroll" />}
          label="Open payruns"
          value={String(data.activePayruns)}
        />
      </div>

      <ListCard
        columns={[
          { key: "module", label: "Module" },
          { key: "tier", label: "Tier", className: "w-32" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        header={<p className="text-sm font-medium text-[var(--foreground-primary)]">Module entitlements</p>}
        rows={data.modules.map((module) => ({
          id: module.key,
          cells: {
            module: <span className="font-medium">{module.label}</span>,
            tier: <span className="text-sm text-[var(--foreground-secondary)]">{module.tier}</span>,
            status: (
              <StatusPill
                label={module.enabled ? "Enabled" : "Disabled"}
                tone={module.enabled ? "success" : "neutral"}
              />
            ),
          },
        }))}
      />

      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">Organization settings</p>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Configure branches, statutory settings, and payroll from the HR portal. Enterprise and Pro add-ons are
          tracked here until dedicated owner settings screens ship.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/owner/settings"
          >
            Module settings
          </Link>
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/payroll"
          >
            Payroll
          </Link>
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/audit"
          >
            Audit log
          </Link>
        </div>
      </div>
    </div>
  );
}
