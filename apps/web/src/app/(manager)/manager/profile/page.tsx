import { StatusPill } from "@hrms/ui";

import {
  EmployeeInfoCard,
  EmployeeProfileHeader,
} from "@/components/employee/employee-profile";
import { ManagerProfileTabs } from "@/components/manager/manager-profile";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
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

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          label={employee.status}
          tone={employee.status === "active" ? "success" : "warning"}
        />
        <span className="text-sm text-[var(--foreground-secondary)]">Manager portal</span>
      </div>

      <ManagerProfileTabs active="personal" />

      <div className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
        <EmployeeInfoCard label="Work email" value={employee.email} />
        <EmployeeInfoCard label="Phone" value={employee.profile.phone} />
        <EmployeeInfoCard label="Branch" value={employee.branchName} />
        <EmployeeInfoCard label="Department" value={employee.departmentName} />
        <EmployeeInfoCard label="Join date" value={employee.joinDate} />
        <EmployeeInfoCard label="Direct reports" value="See team views" />
      </div>
    </div>
  );
}
