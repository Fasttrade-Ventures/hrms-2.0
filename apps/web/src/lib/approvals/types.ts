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
  replacement_credit: "Replacement Credit",
  late: "Report Late",
  attendance: "Manual Attendance",
};

export type ApproverType =
  | "manager"
  | "department_head"
  | "specific_employee"
  | "hr_admin";

export type EscalationAction =
  | "none"
  | "escalate_to_manager_of_manager"
  | "escalate_to_hr"
  | "escalate_to_employee";

export type ApprovalWorkflowStepConfig = {
  stepOrder: number;
  stepLabel: string;
  approverType: ApproverType;
  specificEmployeeId?: string | null;
  timeoutDays?: number | null;
  escalationAction?: EscalationAction;
  escalationEmployeeId?: string | null;
};

export type ApprovalWorkflowConfig = {
  id?: string;
  organizationId: string;
  requestType: ApprovalRequestType;
  name: string;
  isActive: boolean;
  steps: ApprovalWorkflowStepConfig[];
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
  stepOrder?: number;
  stepLabel?: string;
  isEscalated?: boolean;
  dueDate?: string | null;
};

export type ApprovalDetail = ApprovalInboxRow & {
  payload: Record<string, unknown>;
  comment: string | null;
  totalSteps?: number;
};

