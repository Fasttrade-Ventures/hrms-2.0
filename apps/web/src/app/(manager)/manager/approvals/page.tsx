import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ManagerApprovalsView } from "@/components/manager/manager-approvals-view";
import { listManagerApprovals } from "@/lib/manager/approvals";
import { requireRole } from "@/lib/auth/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  await requireRole("manager");
  const params = await searchParams;
  const rows = await listManagerApprovals({ status: "all" }).catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Review, action, and track your team's leave, claim, and attendance requests."
        title="Approvals inbox"
      />

      <ManagerApprovalsView
        rows={rows}
        approvedNotice={Boolean(params.approved)}
        rejectedNotice={Boolean(params.rejected)}
      />
    </div>
  );
}
