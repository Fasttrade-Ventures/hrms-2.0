export type AppraisalStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled" | "revoked";

export type AppraisalDetail = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string | null;
  cycleId: string;
  cycleName: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  cycleClosed: boolean;
  status: AppraisalStatus;
  selfRating: number | null;
  selfComments: string | null;
  managerRating: number | null;
  managerComments: string | null;
};

export type EmployeeAppraisalListItem = {
  id: string;
  cycleName: string;
  dueDate: string;
  status: AppraisalStatus;
  selfRating: number | null;
  managerRating: number | null;
  cycleClosed: boolean;
};

export function parseRating(value: FormDataEntryValue | null): number {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer from 1 to 5.");
  }
  return rating;
}

export function appraisalStatusLabel(status: AppraisalStatus): string {
  const labels: Record<AppraisalStatus, string> = {
    draft: "Draft",
    pending: "Pending manager",
    approved: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled",
    revoked: "Revoked",
  };
  return labels[status] ?? status;
}

export function appraisalStatusTone(
  status: AppraisalStatus,
): "neutral" | "success" | "warning" | "danger" | "pending" {
  if (status === "approved") return "success";
  if (status === "pending") return "pending";
  if (status === "rejected" || status === "revoked") return "danger";
  if (status === "cancelled") return "warning";
  return "neutral";
}
