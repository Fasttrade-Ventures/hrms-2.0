import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportsHub } from "@/components/reports/reports-hub";
import { requireBranchAdminContext } from "@/lib/branch-admin/context";

export default async function BranchReportsHubPage() {
  const context = await requireBranchAdminContext();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description={`${context.branchName} · operational reports locked to this branch`}
        title="Reports"
      />
      <ReportsHub basePath="/branch-admin/reports" portal="branch-admin" />
    </div>
  );
}
