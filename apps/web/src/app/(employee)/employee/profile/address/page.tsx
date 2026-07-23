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

  const addressLines = [
    employee.profile.addressLine1,
    employee.profile.addressLine2,
    [employee.profile.postcode, employee.profile.city].filter(Boolean).join(" "),
    employee.profile.state,
    employee.profile.country,
  ]
    .filter(Boolean)
    .join(", ");

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

      <EmployeeProfileTabs active="address" />

      <div className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
        <EmployeeInfoCard label="Address line 1" value={employee.profile.addressLine1} />
        <EmployeeInfoCard label="Address line 2" value={employee.profile.addressLine2} />
        <EmployeeInfoCard label="City" value={employee.profile.city} />
        <EmployeeInfoCard label="State" value={employee.profile.state} />
        <EmployeeInfoCard label="Postcode" value={employee.profile.postcode} />
        <EmployeeInfoCard label="Country" value={employee.profile.country} />
        <div className="md:col-span-2">
          <EmployeeInfoCard label="Formatted address" value={addressLines || null} />
        </div>
      </div>

      <p className="text-sm text-[var(--foreground-muted)]">
        Contact HR if your address needs to be updated.
      </p>
    </div>
  );
}
