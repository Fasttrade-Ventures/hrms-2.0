import Link from "next/link";

import {
  EmployeeProfileHeader,
} from "@/components/employee/employee-profile";
import { HrProfileTabs } from "@/components/hr/hr-profile";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";

export default async function HrProfileSecurityPage() {
  const session = await requireRole("hr_administrator");
  const employee = await getCurrentEmployeeDetail();

  const email = employee?.email ?? session.user.email ?? "—";
  const roles =
    employee?.membership?.roles.join(", ") ??
    session.membership.roles.join(", ") ??
    "hr_administrator";

  return (
    <div className="space-y-6">
      {employee ? (
        <EmployeeProfileHeader
          branchName={employee.branchName}
          departmentName={employee.departmentName}
          email={employee.email}
          employeeNumber={employee.employeeNumber}
          fullName={employee.fullName}
        />
      ) : (
        <PortalPageHeader
          description={email}
          title={session.user.fullName ?? "Profile"}
        />
      )}

      <HrProfileTabs active="security" />

      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Password</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Change your password regularly. You will need your current password to confirm the update.
        </p>
        <Link
          className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          href="/auth/change-password"
        >
          Change password
        </Link>
      </section>

      <section className="space-y-2 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Account</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">Signed in as {email}</p>
        <p className="text-sm text-[var(--foreground-muted)]">Roles: {roles}</p>
      </section>
    </div>
  );
}
