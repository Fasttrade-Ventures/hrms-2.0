import { StatusPill } from "@hrms/ui";
import { redirect } from "next/navigation";

import { EmployeePayrollDeclarationsForm } from "@/components/employee/employee-payroll-declarations-form";
import {
  EmployeeProfileHeader,
  EmployeeProfileTabs,
} from "@/components/employee/employee-profile";
import { getEmployeePayrollDeclarations } from "@/lib/employee/payroll-declarations";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";

export default async function Page() {
  const employee = await getCurrentEmployeeDetail();

  if (!employee) {
    redirect("/auth/login?error=no_membership");
  }

  const declarations = await getEmployeePayrollDeclarations().catch(() => null);
  if (!declarations) {
    redirect("/employee/profile");
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

      <StatusPill label={employee.status} tone={employee.status === "active" ? "success" : "warning"} />

      <EmployeeProfileTabs active="payroll" />

      <div className="space-y-3">
        <p className="text-sm text-[var(--foreground-secondary)]">
          Update your tax reliefs, zakat, and optional extra EPF contribution. Contact HR to change
          salary, marital status, or your statutory EPF rate.
        </p>
        <EmployeePayrollDeclarationsForm declarations={declarations} />
      </div>
    </div>
  );
}
