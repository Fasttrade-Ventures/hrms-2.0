import type { NotificationPortal } from "@/lib/notifications/placeholders";
import type { NotificationRow } from "@/lib/notifications/types";

export function employeeRequestDetailHref(
  requestType: string,
  sourceId: string,
): string | null {
  switch (requestType) {
    case "leave":
      return `/employee/leave/${sourceId}`;
    case "claim":
      return "/employee/claims";
    case "overtime":
      return "/employee/overtime";
    case "replacement_credit":
      return "/employee/replacement-credit";
    case "late":
      return "/employee/report-late";
    case "attendance":
      return "/employee/manual-attendance";
    default:
      return null;
  }
}

export function announcementNotificationHref(
  announcementId: string,
  portal: NotificationPortal,
): string {
  if (portal === "hr") return `/hr/announcements?view=${announcementId}`;
  if (portal === "manager") return `/manager/announcements/${announcementId}`;
  return `/employee/announcements/${announcementId}`;
}

function extractAnnouncementId(row: NotificationRow): string | null {
  const announcementId = row.payload.announcementId;
  if (typeof announcementId === "string") return announcementId;

  const payloadHref = row.payload.href;
  if (typeof payloadHref === "string") {
    const match = payloadHref.match(/\/announcements\/([0-9a-f-]{36})/i);
    if (match?.[1]) return match[1];
  }

  return null;
}

export function resolveNotificationHref(
  row: NotificationRow,
  portal: NotificationPortal,
): string | null {
  if (row.template === "announcement.published") {
    const announcementId = extractAnnouncementId(row);
    if (announcementId) return announcementNotificationHref(announcementId, portal);
    return portal === "hr" ? "/hr/announcements" : null;
  }

  if (row.template === "approval.pending") {
    const stepId = row.payload.stepId;
    if (typeof stepId === "string") return `/manager/approvals/${stepId}`;
    if (portal === "manager") return "/manager/approvals";
    if (portal === "hr") return "/hr/employees";
    return null;
  }

  if (row.template === "approval.approve" || row.template === "approval.reject") {
    if (portal !== "employee") return null;
    const sourceId = row.payload.sourceId;
    const requestType = String(row.payload.requestType ?? "");
    if (typeof sourceId === "string") {
      return employeeRequestDetailHref(requestType, sourceId);
    }
    return "/employee/leave";
  }

  if (row.template === "document_compliance_employee") {
    if (portal !== "employee") return null;
    return "/employee/documents";
  }

  if (row.template === "document_compliance_hr") {
    if (portal !== "hr") return null;
    const employeeId = row.payload.employeeId;
    const documentType = row.payload.documentType;
    if (typeof employeeId === "string" && typeof documentType === "string") {
      return `/hr/documents/library?employeeId=${employeeId}&documentType=${encodeURIComponent(documentType)}`;
    }
    return "/hr/documents/compliance";
  }

  const payloadHref = row.payload.href;
  if (typeof payloadHref === "string" && payloadHref.startsWith("/")) {
    return payloadHref;
  }

  return null;
}
