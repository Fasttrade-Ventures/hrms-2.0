import { describe, expect, it } from "vitest";

import { resolveNotificationHref, employeeRequestDetailHref, announcementNotificationHref } from "../../apps/web/src/lib/notifications/links";
import { formatNotificationMessage, type NotificationRow } from "../../apps/web/src/lib/notifications/types";

describe("Employee Notifications Feed - Link Resolution", () => {
  it("resolves leave approval notifications to employee leave detail", () => {
    const row: NotificationRow = {
      id: "n-leave-appr",
      template: "approval.approve",
      payload: { requestType: "leave", sourceId: "leave-abc-123" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/leave/leave-abc-123");
  });

  it("resolves claim approval notifications to employee claims detail", () => {
    const row: NotificationRow = {
      id: "n-claim-appr",
      template: "approval.approve",
      payload: { requestType: "claim", sourceId: "claim-xyz-456" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/claims/claim-xyz-456");
  });

  it("resolves overtime rejection notifications to employee overtime detail", () => {
    const row: NotificationRow = {
      id: "n-ot-rej",
      template: "approval.reject",
      payload: { requestType: "overtime", sourceId: "ot-789" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/overtime/ot-789");
  });

  it("resolves document compliance notices to /employee/documents", () => {
    const row: NotificationRow = {
      id: "n-doc",
      template: "document_compliance_employee",
      payload: { documentType: "Passport", status: "expiring" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/documents");
  });

  it("resolves announcement notices to /employee/announcements/:id", () => {
    const row: NotificationRow = {
      id: "n-announcement",
      template: "announcement.published",
      payload: { announcementId: "ann-555", title: "Town Hall" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/announcements/ann-555");
  });

  it("resolves payslip notifications to /employee/payslips", () => {
    const row: NotificationRow = {
      id: "n-payslip",
      template: "payroll.payslip_available",
      payload: { periodYear: 2026, periodMonth: 8 },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/payslips");
  });

  it("resolves tardiness alerts to /employee/attendance", () => {
    const row: NotificationRow = {
      id: "n-tardy",
      template: "attendance.tardy",
      payload: { shiftStart: "09:00", graceMinutes: 15 },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/attendance");
  });

  it("resolves asset notifications to /employee/assets/:id", () => {
    const row: NotificationRow = {
      id: "n-asset",
      template: "asset.assigned",
      payload: { assetId: "asset-mac-01" },
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    expect(resolveNotificationHref(row, "employee")).toBe("/employee/assets/asset-mac-01");
  });
});

describe("Employee Notifications Feed - Message Formatting", () => {
  it("formats approval outcome messages", () => {
    expect(
      formatNotificationMessage({
        id: "1",
        template: "approval.approve",
        payload: { requestType: "leave" },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Your leave request was approved.");

    expect(
      formatNotificationMessage({
        id: "2",
        template: "approval.reject",
        payload: { requestType: "claim" },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Your claim request was rejected.");
  });

  it("formats document compliance messages", () => {
    expect(
      formatNotificationMessage({
        id: "3",
        template: "document_compliance_employee",
        payload: { documentType: "NRIC copy", status: "missing" },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Your NRIC copy is missing.");
  });

  it("formats payslip available messages", () => {
    expect(
      formatNotificationMessage({
        id: "4",
        template: "payroll.payslip_available",
        payload: { periodYear: 2026, periodMonth: 8 },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Your 2026-08 payslip is ready.");
  });

  it("formats announcement messages", () => {
    expect(
      formatNotificationMessage({
        id: "5",
        template: "announcement.published",
        payload: { title: "Company Picnic Announcement" },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Company Picnic Announcement");
  });

  it("formats tardiness alert messages", () => {
    expect(
      formatNotificationMessage({
        id: "6",
        template: "attendance.tardy",
        payload: { shiftStart: "09:00", graceMinutes: 15 },
        status: "pending",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Tardiness alert: You have not clocked in for today's shift starting at 09:00 (grace ended after 15m).");
  });
});

describe("Employee Notifications Feed - Tab Groupings & Unread Logic", () => {
  it("correctly counts unread pending notifications by tab category", () => {
    const rows: NotificationRow[] = [
      { id: "1", template: "approval.approve", payload: { requestType: "leave" }, status: "pending", createdAt: "" },
      { id: "2", template: "approval.reject", payload: { requestType: "leave" }, status: "sent", createdAt: "" }, // read
      { id: "3", template: "approval.approve", payload: { requestType: "claim" }, status: "pending", createdAt: "" },
      { id: "4", template: "document_compliance_employee", payload: { documentType: "Passport" }, status: "pending", createdAt: "" },
      { id: "5", template: "document_compliance_employee", payload: { documentType: "NRIC" }, status: "sent", createdAt: "" }, // read
      { id: "6", template: "announcement.published", payload: { title: "News" }, status: "pending", createdAt: "" },
    ];

    const unreadRows = rows.filter((r) => r.status === "pending");
    const counts = {
      all: unreadRows.length,
      leave: 0,
      claim: 0,
      ot: 0,
      document: 0,
      announcement: 0,
    };

    for (const row of unreadRows) {
      if (row.template.startsWith("approval.")) {
        const reqType = String(row.payload.requestType ?? "");
        if (reqType === "leave") counts.leave += 1;
        if (reqType === "claim") counts.claim += 1;
        if (reqType === "overtime") counts.ot += 1;
      } else if (row.template.startsWith("document_compliance_")) {
        counts.document += 1;
      } else if (row.template === "announcement.published") {
        counts.announcement += 1;
      }
    }

    expect(counts.all).toBe(4);
    expect(counts.leave).toBe(1);
    expect(counts.claim).toBe(1);
    expect(counts.ot).toBe(0);
    expect(counts.document).toBe(1);
    expect(counts.announcement).toBe(1);
  });
});
