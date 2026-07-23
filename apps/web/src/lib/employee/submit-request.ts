import { submitForApproval } from "@/lib/approvals/service";
import type { ApprovalRequestType, ApprovalSourceTable } from "@/lib/approvals/types";
import { requireAuth } from "@/lib/auth/session";
import { requireEmployeeContext } from "@/lib/employee/leave";

export async function submitEmployeeRequest(input: {
  requestType: ApprovalRequestType;
  sourceTable: ApprovalSourceTable;
  sourceId: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  const session = await requireAuth();
  const { employeeId, organizationId } = await requireEmployeeContext();

  await submitForApproval({
    organizationId,
    requesterEmployeeId: employeeId,
    requestType: input.requestType,
    sourceTable: input.sourceTable,
    sourceId: input.sourceId,
    actorUserId: session.user.id,
    payload: input.payload,
  });
}
