import { HrOperationsView } from "@/components/hr/operations/hr-operations-view";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listOrgApprovals } from "@/lib/hr/operations";
import { requireRole } from "@/lib/auth/session";

export default async function HrOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  await requireRole("hr_administrator");
  const params = await searchParams;
  const rows = await listOrgApprovals({ status: "all" }).catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Review, action on behalf of managers, and track org-wide leave, claim, and attendance requests."
        title="HR operations"
      />

      <HrOperationsView
        rows={rows}
        approvedNotice={Boolean(params.approved)}
        rejectedNotice={Boolean(params.rejected)}
      />
    </div>
  );
}
