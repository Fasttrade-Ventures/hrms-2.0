import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getApprovalWorkflow, listApproverCandidates } from "@/lib/hr/approval-workflows";
import { ApprovalWorkflowEditor } from "@/components/hr/organization/approval-workflows/approval-workflow-editor";

export default async function EditApprovalWorkflowPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  await requireRole("hr_administrator");
  const { workflowId } = await params;

  const [workflow, candidates] = await Promise.all([
    getApprovalWorkflow(workflowId),
    listApproverCandidates(),
  ]);

  if (!workflow) {
    notFound();
  }

  return <ApprovalWorkflowEditor workflow={workflow} candidates={candidates} />;
}
