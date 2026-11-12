import { redirect } from "next/navigation";

export default async function ApprovalWorkflowDetailPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { workflowId } = await params;
  redirect(`/hr/organization/approval-workflows/${workflowId}/edit`);
}

