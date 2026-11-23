import Link from "next/link";

import { EmployeeProfileHeader } from "@/components/employee/employee-profile";
import { ManagerProfileTabs } from "@/components/manager/manager-profile";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function ProfileSecurityPage() {
  await requireRole("manager");
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

      <ManagerProfileTabs active="security" />

      <PortalSectionCard
        description="Change your password regularly. You will need your current password to confirm the update."
        title="Password"
      >
        <Link
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          href="/auth/change-password"
        >
          Change password
        </Link>
      </PortalSectionCard>
    </div>
  );
}
