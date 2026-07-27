import { REQUEST_TYPE_LABELS } from "@/lib/approvals/types";

export type NotificationRow = {
  id: string;
  template: string;
  payload: Record<string, unknown>;
  status: string;
  createdAt: string;
};

export function formatNotificationMessage(row: NotificationRow): string {
  if (row.template === "approval.pending") {
    const requestType = String(row.payload.requestType ?? "");
    const label =
      REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return `${label} request awaiting your approval.`;
  }
  if (row.template === "approval.approve") {
    const requestType = String(row.payload.requestType ?? "");
    const label =
      REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return `Your ${label.toLowerCase()} request was approved.`;
  }
  if (row.template === "approval.reject") {
    const requestType = String(row.payload.requestType ?? "");
    const label =
      REQUEST_TYPE_LABELS[requestType as keyof typeof REQUEST_TYPE_LABELS] ?? "Request";
    return `Your ${label.toLowerCase()} request was rejected.`;
  }
  if (row.template === "announcement.published") return String(row.payload.title ?? "New announcement");
  if (row.template === "document_compliance_employee") {
    const documentType = String(row.payload.documentType ?? "document");
    const status = String(row.payload.status ?? "missing");
    return `Your ${documentType} is ${status}.`;
  }
  if (row.template === "document_compliance_hr") {
    const employeeName = String(row.payload.employeeName ?? "Employee");
    const documentType = String(row.payload.documentType ?? "document");
    const status = String(row.payload.status ?? "missing");
    return `${employeeName}'s ${documentType} is ${status}.`;
  }
  if (row.template === "payroll.payslip_available") {
    const year = Number(row.payload.periodYear ?? 0);
    const month = Number(row.payload.periodMonth ?? 0);
    if (year && month) return `Your ${year}-${String(month).padStart(2, "0")} payslip is ready.`;
    return "Your payslip is ready.";
  }
  return row.template;
}
