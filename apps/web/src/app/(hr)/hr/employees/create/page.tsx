import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { CreateEmployeeForm } from "@/components/hr/employees/create-employee-form";
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
    <div className="space-y-8">
      <PortalPageHeader
        description="Create an employee record and optionally send an activation email for portal access."
        title="Create employee"
      />
      <CreateEmployeeForm
        branches={options.branches}
        departments={options.departments}
        joinDate={joinDate}
        managers={options.managers}
        suggestedEmployeeNumber={suggestedEmployeeNumber}
      />
    </div>
  );
}
