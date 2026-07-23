import { StatusPill } from "@hrms/ui";

import {
  EmployeeInfoCard,
  EmployeeProfileHeader,
  EmployeeProfileTabs,
} from "@/components/employee/employee-profile";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { redirect } from "next/navigation";

export default async function Page() {
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
        {employee.managerName ? (
          <span className="text-sm text-[var(--foreground-secondary)]">
            Reports to {employee.managerName}
          </span>
        ) : null}
      </div>

      <EmployeeProfileTabs active="personal" />

      <div className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
        <EmployeeInfoCard label="Work email" value={employee.email} />
        <EmployeeInfoCard label="Phone" value={employee.profile.phone} />
        <EmployeeInfoCard label="IC / ID number" value={employee.profile.icNumber} />
        <EmployeeInfoCard label="Join date" value={employee.joinDate} />
        <EmployeeInfoCard label="Branch" value={employee.branchName} />
        <EmployeeInfoCard label="Department" value={employee.departmentName} />
      </div>
    </div>
  );
}
