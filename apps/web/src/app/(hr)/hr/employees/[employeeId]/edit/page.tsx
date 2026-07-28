import { notFound } from "next/navigation";

import { EditEmployeeForm } from "@/components/hr/employees/edit-employee-form";
import { EmployeePayrollSection } from "@/components/hr/payroll/employee-payroll-section";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDetail, getEmployeeOptions } from "@/lib/employees/queries";
import { getEmployeePayrollSectionData } from "@/lib/payroll/employee-payroll-section-data";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ employeeId: string }>;
  searchParams: Promise<{ created?: string; emailWarning?: string }>;
}) {
  await requireRole("hr_administrator");

  const { employeeId } = await params;
  const query = await searchParams;

  const [employee, options] = await Promise.all([
    getEmployeeDetail(employeeId),
    getEmployeeOptions(),
  ]);

  if (!employee) {
    notFound();
  }

  const payroll = await getEmployeePayrollSectionData(employee);

  let banner: string | undefined;

  if (employee.status === "inactive") {
    banner = "This employee is inactive. Reactivate from the Employment tab before they can access the portal.";
  } else if (employee.status === "terminated") {
    banner = "This employee is terminated. Profile is read-only except for HR notes and compliance records.";
  }

  if (query.created === "1") {
    banner =
      query.emailWarning === "1"
        ? "Employee created. Activation email could not be sent — check Resend configuration and resend from the Employment tab."
        : "Employee created successfully.";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <HrLinkButton href={`/hr/employees/${employee.id}`} variant="outline">
              View profile
            </HrLinkButton>
            <HrLinkButton href="/hr/employees" variant="outline">
              Back to list
            </HrLinkButton>
          </div>
        }
        description={`${employee.fullName} · ${employee.employeeNumber} — update profile, payroll, and statutory settings on one page.`}
        title="Edit employee"
      />
      <EditEmployeeForm
        banner={banner}
        branches={options.branches}
        departments={options.departments}
        employee={employee}
        leaveTypes={options.leaveTypes}
        managers={options.managers}
        payGroups={options.payGroups}
        shifts={options.shifts}
      />

      <EmployeePayrollSection
        allowanceComponents={payroll.allowanceComponents}
        allowances={payroll.allowances}
        compensation={payroll.compensation}
        employeeId={employee.id}
        taxProfile={payroll.taxProfile}
      />
    </div>
  );
}
