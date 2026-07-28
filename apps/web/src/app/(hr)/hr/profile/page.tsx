import { StatusPill } from "@hrms/ui";

import {
  EmployeeInfoCard,
  EmployeeProfileHeader,
} from "@/components/employee/employee-profile";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { HrProfileTabs } from "@/components/hr/hr-profile";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";

export default async function HrProfilePage() {
  const session = await requireRole("hr_administrator");
  const employee = await getCurrentEmployeeDetail();

  if (!employee) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          description={session.user.email ?? "HR Administrator"}
          title={session.user.fullName ?? "Profile"}
        />
        <HrProfileTabs active="personal" />
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <p className="text-sm text-[var(--foreground-secondary)]">
            No employee record is linked to your account. Contact your organization owner to link
            your login to an employee profile.
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Signed in as {session.user.email ?? "—"}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <EmployeeProfileHeader
          branchName={employee.branchName}
          departmentName={employee.departmentName}
          email={employee.email}
          employeeNumber={employee.employeeNumber}
          fullName={employee.fullName}
        />
        <div className="flex flex-wrap gap-2">
          <HrLinkButton href={`/hr/employees/${employee.id}`} variant="outline">
            View profile
          </HrLinkButton>
          <HrLinkButton href={`/hr/employees/${employee.id}/edit`}>Edit my record</HrLinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          label={employee.status}
          tone={employee.status === "active" ? "success" : "warning"}
        />
        <span className="text-sm text-[var(--foreground-secondary)]">HR Administrator</span>
      </div>

      <HrProfileTabs active="personal" />

      <div className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
        <EmployeeInfoCard label="Work email" value={employee.email} />
        <EmployeeInfoCard label="Phone" value={employee.profile.phone} />
        <EmployeeInfoCard label="Job title" value={employee.jobTitle} />
        <EmployeeInfoCard label="Join date" value={employee.joinDate} />
        <EmployeeInfoCard label="Branch" value={employee.branchName} />
        <EmployeeInfoCard label="Department" value={employee.departmentName} />
        <EmployeeInfoCard label="Manager" value={employee.managerName} />
        <EmployeeInfoCard label="Shift" value={employee.shiftName} />
      </div>
    </div>
  );
}
