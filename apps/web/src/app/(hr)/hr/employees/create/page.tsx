import { CreateEmployeeForm } from "@/components/hr/employees/create-employee-form";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
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
          <HrLinkButton href="/hr/employees" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Add employment details, personal info, dependents, and emergency contacts."
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
