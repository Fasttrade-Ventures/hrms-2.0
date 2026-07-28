import { REQUEST_TYPE_LABELS, type ApprovalDetail, type ApprovalInboxRow, type ApprovalRequestType } from "./types";

export function summarizeApprovalPayload(
  requestType: ApprovalRequestType,
  payload: Record<string, unknown>,
): string {
  switch (requestType) {
    case "leave":
      return `${payload.leaveTypeName ?? "Leave"} · ${payload.startDate ?? ""} → ${payload.endDate ?? ""}`;
    case "claim":
      return `${payload.claimTypeName ?? "Claim"} · RM ${payload.amount ?? "0"}`;
    case "overtime":
      return `${payload.workDate ?? ""} · ${payload.hours ?? "0"}h @ ${payload.rateType ?? "1.5"}x`;
    case "replacement_credit":
      return `${payload.workDate ?? ""} · ${payload.creditDays ?? "1"} day(s)`;
    case "late":
      return `${payload.requestDate ?? ""} · arrived ${payload.actualArrivalTime ?? ""}`;
    case "attendance":
      return `${payload.requestDate ?? ""} · manual attendance`;
    default:
      return "Pending request";
  }
}

export function mapApprovalInboxRow(row: Record<string, unknown>): ApprovalInboxRow {
  const request = row.approval_requests as Record<string, unknown>;
  const requester = request.employees as Record<string, unknown> | null;
  const profile = requester?.employee_profiles as Record<string, unknown> | null;
  const requestType = request.request_type as ApprovalRequestType;
  const payload = (request.payload ?? {}) as Record<string, unknown>;

  return {
    stepId: String(row.id),
    requestId: String(request.id),
    requestType,
    requestTypeLabel: REQUEST_TYPE_LABELS[requestType] ?? requestType,
    requesterName: String(profile?.full_name ?? requester?.email ?? "Employee"),
    requesterEmployeeNumber: String(requester?.employee_number ?? "—"),
    submittedAt: String(request.submitted_at ?? request.created_at ?? ""),
    summary: summarizeApprovalPayload(requestType, payload),
    status: String(row.status),
  };
}

export function mapApprovalDetail(row: Record<string, unknown>): ApprovalDetail {
  const base = mapApprovalInboxRow(row);
  const request = row.approval_requests as Record<string, unknown>;

  return {
    ...base,
    payload: (request.payload ?? {}) as Record<string, unknown>,
    comment: (row as { comment?: string | null }).comment ?? null,
  };
}
