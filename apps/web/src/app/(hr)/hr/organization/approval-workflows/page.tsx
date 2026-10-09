import { requireRole } from "@/lib/auth/session";
import { listApprovalWorkflows } from "@/lib/hr/approval-workflows";
import { ApprovalWorkflowsList } from "@/components/hr/organization/approval-workflows/approval-workflows-list";

export default async function ApprovalWorkflowsPage() {
  await requireRole("hr_administrator");
  const workflows = await listApprovalWorkflows();

  return <ApprovalWorkflowsList workflows={workflows} />;
}
