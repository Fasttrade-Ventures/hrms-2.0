import Link from "next/link";

import { CreateEmployeeForm } from "@/components/hr/employees/create-employee-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getEmployeeOptions, getSuggestedEmployeeNumber } from "@/lib/employees/queries";

export default async function CreateEmployeePage() {
  await requireRole("hr_administrator");

  const [suggestedEmployeeNumber, options] = await Promise.all([
    getSuggestedEmployeeNumber(),
    getEmployeeOptions(),
  ]);

  const joinDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/employees"
          >
            Back to list
          </Link>
        }
        description="Tabbed profile create — employment, personal & bank, family, and emergency."
        title="Create employee"
      />
      <CreateEmployeeForm
        branches={options.branches}
        departments={options.departments}
        joinDate={joinDate}
        leaveTypes={options.leaveTypes}
        managers={options.managers}
        payGroups={options.payGroups}
        shifts={options.shifts}
        suggestedEmployeeNumber={suggestedEmployeeNumber}
      />
    </div>
  );
}
