import { StatusPill } from "@hrms/ui";

import { EmployeeProfileHeader } from "@/components/employee/employee-profile";
import { ManagerProfileTabs } from "@/components/manager/manager-profile";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { getCurrentEmployeeDetail } from "@/lib/employees/self";
import { requireRole } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Page() {
  await requireRole("manager");
  const employee = await getCurrentEmployeeDetail();

  if (!employee) {
    redirect("/auth/login?error=no_membership");
  }

  const tiles = [
    { label: "Work email", value: employee.email },
    { label: "Phone", value: employee.profile.phone },
    { label: "Branch", value: employee.branchName },
    { label: "Department", value: employee.departmentName },
    { label: "Join date", value: employee.joinDate },
    { label: "Direct reports", value: "See team views" },
  ];

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

      <PortalSectionCard
        description="Work contact and organisation placement for your manager account."
        title="Personal details"
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {tiles.map((item) => (
            <div
              className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5"
              key={item.label}
            >
              <dt className="text-xs text-[var(--foreground-muted)]">{item.label}</dt>
              <dd className="mt-1 font-medium text-[var(--foreground-primary)]">
                {item.value?.trim() || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </PortalSectionCard>
    </div>
  );
}
