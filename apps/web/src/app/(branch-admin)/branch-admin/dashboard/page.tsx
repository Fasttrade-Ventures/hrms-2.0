import Link from "next/link";

import { StatCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PortalIcon } from "@/components/portal/portal-icons";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { getBranchDashboardData } from "@/lib/branch-admin/dashboard";
import { greetingForHour } from "@/lib/employees/self";

export default async function Page() {
  const context = await requireBranchAdminContext();
  const data = await getBranchDashboardData(context.organizationId, context.branchId);
  const hour = new Date().getHours();
  const firstName = context.fullName?.split(/\s+/)[0] ?? "Admin";

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${context.branchName}${context.branchCode ? ` · ${context.branchCode}` : ""} · ${data.employeeCount} employees`}
        title={`${greetingForHour(hour)}, ${firstName}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          hint="Active in this branch"
          icon={<PortalIcon name="employees" />}
          label="Employees"
          value={String(data.employeeCount)}
        />
        <StatCard
          hint="Clocked in today"
          icon={<PortalIcon name="attendance" />}
          label="Present today"
          value={String(data.presentToday)}
        />
        <StatCard
          hint="Approved leave today"
          icon={<PortalIcon name="leave" />}
          label="On leave"
          value={String(data.onLeaveToday)}
        />
        <StatCard
          hint="Missing required docs"
          icon={<PortalIcon name="documents" />}
          label="Compliance gaps"
          value={String(data.complianceGaps)}
        />
      </div>

      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">Branch operations</p>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          {data.pendingApprovals} pending approval{data.pendingApprovals === 1 ? "" : "s"} from employees in this
          branch. Use HR portal for org-wide payroll and policy changes.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/branch-admin/employees"
          >
            View employees
          </Link>
          <Link
            className="rounded-[var(--radius-md)] border border-[var(--border-primary)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/documents"
          >
            Document compliance
          </Link>
        </div>
      </div>
    </div>
  );
}
