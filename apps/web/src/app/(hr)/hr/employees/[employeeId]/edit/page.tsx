import Link from "next/link";
import { notFound } from "next/navigation";

import { EditEmployeeForm } from "@/components/hr/employees/edit-employee-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeDetail, getEmployeeOptions } from "@/lib/employees/queries";

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

  let banner: string | undefined;

  if (query.created === "1") {
    banner =
      query.emailWarning === "1"
        ? "Employee created. Activation email could not be sent — check Resend configuration and resend from the Employment tab."
        : "Employee created successfully.";
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href={`/hr/employees/${employee.id}`}
            >
              View profile
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/employees"
            >
              Back to list
            </Link>
          </div>
        }
        description="Tabbed profile edit — employment, personal & bank, family, and emergency."
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
    </div>
  );
}
