import { requireRole } from "@/lib/auth/session";
import { listApproverCandidates } from "@/lib/hr/approval-workflows";
import { ApprovalWorkflowEditor } from "@/components/hr/organization/approval-workflows/approval-workflow-editor";

export default async function CreateApprovalWorkflowPage() {
  await requireRole("hr_administrator");
  const candidates = await listApproverCandidates();

  return <ApprovalWorkflowEditor candidates={candidates} />;
}
