import Link from "next/link";

import { ListCard, StatCard, StatusPill } from "@hrms/ui";

import { PortalCard } from "@/components/portal/portal-card";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { updateModuleFlagFormAction } from "@/app/(owner)/owner/actions";
import { PortalIcon } from "@/components/portal/portal-icons";
import { ConfirmModuleToggle } from "@/components/owner/confirm-module-toggle";
import { firstNameFromFullName, greetingForHour } from "@/lib/employees/self";
import { getOwnerDashboardData } from "@/lib/owner/dashboard";
import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export default async function Page() {
  const session = await requireRole("organization_owner");
  const organizationId = await requireOrganizationId();
  const data = await getOwnerDashboardData(organizationId);
  const hour = new Date().getHours();
  const name = firstNameFromFullName(session.user.fullName, session.user.email);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${data.deploymentMode} deployment · module entitlements and organization health`}
        title={`${greetingForHour(hour)}, ${name}`}
      />

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
              <div className="flex items-center justify-end gap-2">
                <StatusPill
                  label={module.enabled ? "Enabled" : "Disabled"}
                  tone={module.enabled ? "success" : "neutral"}
                />
                <ConfirmModuleToggle
                  action={updateModuleFlagFormAction}
                  enabled={module.enabled}
                  fields={{ module: module.key, enabled: module.enabled ? "false" : "true" }}
                  subject={module.label}
                />
              </div>
            ),
          },
        }))}
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

      <PortalCard padding="lg">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">Organization settings</p>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Configure branches, statutory settings, and payroll from the HR portal. Country, package, and module
          switches are on the owner settings page.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/owner/settings"
          >
            Module settings
          </Link>
          {data.modules.some((module) => module.key === "payroll" && module.enabled) ? (
            <Link
              className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/payroll"
            >
              Payroll
            </Link>
          ) : null}
          {data.modules.some((module) => module.key === "audit" && module.enabled) ? (
            <Link
              className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/audit"
            >
              Audit log
            </Link>
          ) : null}
        </div>
      </PortalCard>
    </div>
  );
}
