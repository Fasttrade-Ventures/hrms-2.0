export type ApprovalRequestType =
  | "leave"
  | "claim"
  | "overtime"
  | "replacement_credit"
  | "late"
  | "attendance";

export type ApprovalSourceTable =
  | "leave_requests"
  | "claims"
  | "overtime_requests"
  | "replacement_credits"
  | "late_requests"
  | "attendance_requests";

export const REQUEST_TYPE_LABELS: Record<ApprovalRequestType, string> = {
  leave: "Leave",
  claim: "Claim",
  overtime: "Overtime",
  replacement_credit: "Replacement credit",
  late: "Late arrival",
  attendance: "Manual attendance",
};

export type ApprovalInboxRow = {
  stepId: string;
  requestId: string;
  requestType: ApprovalRequestType;
  requestTypeLabel: string;
  requesterName: string;
  requesterEmployeeNumber: string;
  submittedAt: string;
  summary: string;
  status: string;
};

export type ApprovalDetail = ApprovalInboxRow & {
  payload: Record<string, unknown>;
  comment: string | null;
};
