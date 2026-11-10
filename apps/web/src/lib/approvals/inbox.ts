import { currencyPrefix, type DisplayCurrency } from "@/lib/money";
import { REQUEST_TYPE_LABELS, type ApprovalDetail, type ApprovalInboxRow, type ApprovalRequestType } from "./types";

export function summarizeApprovalPayload(
  requestType: ApprovalRequestType,
  payload: Record<string, unknown>,
  currency: DisplayCurrency = "MYR",
): string {
  const prefix = currencyPrefix(currency);
  switch (requestType) {
    case "leave":
      return `${payload.leaveTypeName ?? "Leave"} · ${payload.startDate ?? ""} → ${payload.endDate ?? ""}`;
    case "claim":
      if (payload.isMileage && payload.distanceKm) {
        const tripInfo = payload.origin && payload.destination ? ` (${payload.distanceKm} km: ${payload.origin} → ${payload.destination})` : ` (${payload.distanceKm} km)`;
        return `${payload.claimTypeName ?? "Mileage Claim"} · ${prefix}${payload.amount ?? "0"}${tripInfo}`;
      }
      return `${payload.claimTypeName ?? "Claim"} · ${prefix}${payload.amount ?? "0"}`;
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

export function mapApprovalInboxRow(
  row: Record<string, unknown>,
  currency: DisplayCurrency = "MYR",
): ApprovalInboxRow {
  const request = row.approval_requests as Record<string, unknown>;
  const requester = request.employees as Record<string, unknown> | null;
  const requestType = request.request_type as ApprovalRequestType;
  const payload = (request.payload ?? {}) as Record<string, unknown>;

  let status = String(
    request.status === "revoked"
      ? "revoked"
      : request.status === "cancelled"
        ? "cancelled"
        : row.status,
  );
  const comment = String((row as { comment?: string | null }).comment ?? "");
  const cancellationReason = String(payload.cancellationReason ?? "");
  const today = new Date().toISOString().slice(0, 10);

  const isExpired =
    comment.toLowerCase().includes("expired") ||
    cancellationReason.toLowerCase().includes("expired") ||
    (requestType === "leave" &&
      typeof payload.endDate === "string" &&
      payload.endDate < today &&
      (status === "pending" || status === "cancelled"));

  if (isExpired) {
    status = "expired";
  }

  return {
    stepId: String(row.id),
    requestId: String(request.id),
    requestType,
    requestTypeLabel: REQUEST_TYPE_LABELS[requestType] ?? requestType,
    requesterName: String(requester?.full_name ?? requester?.email ?? "Employee"),
    requesterEmployeeNumber: String(requester?.employee_number ?? "-"),
    submittedAt: String(request.submitted_at ?? request.created_at ?? ""),
    summary: summarizeApprovalPayload(requestType, payload, currency),
    status,
    stepOrder: row.step_order != null ? Number(row.step_order) : undefined,
    stepLabel: row.step_label != null ? String(row.step_label) : undefined,
    isEscalated: Boolean(row.is_escalated),
    dueDate: row.due_date != null ? String(row.due_date) : null,
  };
}

export function mapApprovalDetail(
  row: Record<string, unknown>,
  currency: DisplayCurrency = "MYR",
): ApprovalDetail {
  const base = mapApprovalInboxRow(row, currency);
  const request = row.approval_requests as Record<string, unknown>;

  return {
    ...base,
    currency,
    payload: (request.payload ?? {}) as Record<string, unknown>,
    comment: (row as { comment?: string | null }).comment ?? null,
  };
}
