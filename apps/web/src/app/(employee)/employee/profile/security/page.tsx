import Link from "next/link";

import {
  EmployeeProfileHeader,
  EmployeeProfileTabs,
} from "@/components/employee/employee-profile";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { redirect } from "next/navigation";

export default async function ProfileSecurityPage() {
  const employee = await getCurrentEmployeeDetail();

  if (!employee) {
    redirect("/auth/login?error=no_membership");
  }

  return (
    <div className="space-y-6">
      <EmployeeProfileHeader
        branchName={employee.branchName}
        departmentName={employee.departmentName}
        email={employee.email}
        employeeNumber={employee.employeeNumber}
        fullName={employee.fullName}
      />

      <EmployeeProfileTabs active="security" />

      <section className="space-y-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Password</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Change your password regularly. You will need your current password to confirm the update.
        </p>
        <Link
          className="inline-flex h-11 items-center bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
          href="/auth/change-password"
        >
          Change password
        </Link>
      </section>

      <section className="space-y-2 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Account</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          Signed in as {employee.email}
        </p>
        <p className="text-sm text-[var(--foreground-muted)]">
          Roles: {employee.membership?.roles.join(", ") || "employee"}
        </p>
      </section>
    </div>
  );
}
