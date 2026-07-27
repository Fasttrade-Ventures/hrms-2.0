import type { NotificationRow } from "./types";

const now = new Date();
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();

export const employeePlaceholderNotifications: NotificationRow[] = [
  {
    id: "ph-approval-approve",
    template: "approval.approve",
    payload: {
      requestType: "leave",
      sourceId: "sample-leave-id",
      href: "/employee/leave",
    },
    status: "sent",
    createdAt: hoursAgo(2),
  },
  {
    id: "ph-doc-employee",
    template: "document_compliance_employee",
    payload: { documentType: "NRIC copy", status: "missing", href: "/employee/documents" },
    status: "sent",
    createdAt: hoursAgo(26),
  },
  {
    id: "ph-announcement",
    template: "announcement.published",
    payload: {
      title: "Office closure — Hari Raya public holiday",
      announcementId: "sample-announcement-id",
      href: "/employee/announcements/sample-announcement-id",
    },
    status: "sent",
    createdAt: hoursAgo(72),
  },
];

export const managerPlaceholderNotifications: NotificationRow[] = [
  {
    id: "ph-approval-pending",
    template: "approval.pending",
    payload: {
      requestType: "leave",
      stepId: "sample-step-id",
      href: "/manager/approvals/sample-step-id",
    },
    status: "sent",
    createdAt: hoursAgo(1),
  },
  {
    id: "ph-approval-pending-2",
    template: "approval.pending",
    payload: {
      requestType: "claim",
      stepId: "sample-step-id-2",
      href: "/manager/approvals/sample-step-id-2",
    },
    status: "sent",
    createdAt: hoursAgo(5),
  },
  {
    id: "ph-announcement-mgr",
    template: "announcement.published",
    payload: {
      title: "Q3 town hall — save the date",
      announcementId: "sample-announcement-id",
      href: "/manager/announcements/sample-announcement-id",
    },
    status: "sent",
    createdAt: hoursAgo(48),
  },
];

export const hrPlaceholderNotifications: NotificationRow[] = [
  {
    id: "ph-doc-hr",
    template: "document_compliance_hr",
    payload: {
      employeeName: "Aisha Rahman",
      documentType: "Work permit",
      status: "expiring",
      href: "/hr/documents/compliance",
    },
    status: "sent",
    createdAt: hoursAgo(3),
  },
  {
    id: "ph-doc-hr-2",
    template: "document_compliance_hr",
    payload: {
      employeeName: "Kevin Tan",
      documentType: "Passport",
      status: "missing",
      href: "/hr/documents/compliance",
    },
    status: "sent",
    createdAt: hoursAgo(20),
  },
  {
    id: "ph-approval-hr",
    template: "approval.pending",
    payload: {
      requestType: "overtime",
      href: "/hr/employees",
    },
    status: "sent",
    createdAt: hoursAgo(8),
  },
];

export type NotificationPortal = "employee" | "manager" | "hr";

export function getPlaceholderNotifications(portal: NotificationPortal): NotificationRow[] {
  switch (portal) {
    case "employee":
      return employeePlaceholderNotifications;
    case "manager":
      return managerPlaceholderNotifications;
    case "hr":
      return hrPlaceholderNotifications;
  }
}

export const notificationTypeDescriptions: Record<NotificationPortal, string[]> = {
  employee: [
    "Leave, claim, and overtime approval outcomes",
    "Required documents that are missing or expiring",
    "New company announcements",
  ],
  manager: [
    "Leave, claim, and overtime requests awaiting your approval",
    "Team updates and company announcements",
  ],
  hr: [
    "Employee document compliance gaps (missing, expired, expiring)",
    "Approval requests routed to HR",
    "Organization-wide announcements",
  ],
};
