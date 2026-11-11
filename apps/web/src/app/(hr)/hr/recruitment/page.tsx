import { RequisitionHub } from "@/components/hr/recruitment/requisition-hub";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRoleOrPermission } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listBranches, listDepartments } from "@/lib/hr/organization";
import { listRequisitions } from "@/lib/recruitment/requisitions";

export default async function Page() {
  await requireModule("recruitment");
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["recruiter"]);

  const [requisitions, branches, departments] = await Promise.all([
    listRequisitions(),
    listBranches().catch(() => []),
    listDepartments().catch(() => []),
  ]);

  const branchOptions = branches.map((branch) => ({ id: branch.id, name: branch.name }));
  const departmentOptions = departments.map((department) => ({
    id: department.id,
    name: department.name,
  }));

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Manage hiring requisitions and candidate pipeline."
        title="Recruitment"
      />
      <RequisitionHub
        branches={branchOptions}
        departments={departmentOptions}
        requisitions={requisitions}
      />
    </div>
  );
}
