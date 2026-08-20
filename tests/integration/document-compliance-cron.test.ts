import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { scanAndQueueDocumentComplianceNotifications } from "../../apps/web/src/lib/hr/scan-document-compliance";
import { processNotificationOutbox } from "../../apps/web/src/lib/notifications/process-outbox";
import { buildDocumentComplianceEmail } from "../../packages/platform/src/mail/document-compliance";
import { sendDocumentComplianceEmail } from "@hrms/platform";

// Hoist mock definition to globalThis to completely avoid TDZ issues with hoisted vi.mock calls
vi.hoisted(() => {
  function createQueryBuilder(tableName: string) {
    const qb: any = {
      tableName,
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockImplementation((payload: any) => {
        const outbox = (globalThis as any).mockOutbox || [];
        outbox.push({
          id: `outbox-${outbox.length + 1}`,
          recipient_user_id: payload.recipient_user_id,
          template: payload.template,
          channel: payload.channel,
          payload: payload.payload,
          status: "pending",
        });
        (globalThis as any).mockOutbox = outbox;
        return Promise.resolve({ error: null });
      }),
      eq: vi.fn().mockImplementation(() => qb),
      or: vi.fn().mockImplementation(() => qb),
      order: vi.fn().mockImplementation(() => qb),
      limit: vi.fn().mockImplementation(() => qb),
      contains: vi.fn().mockImplementation(() => qb),
      single: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: (globalThis as any).mockMembership || null, error: null });
      }),
      maybeSingle: vi.fn().mockImplementation(() => {
        return Promise.resolve({ data: (globalThis as any).mockMembership || null, error: null });
      }),
      then: vi.fn().mockImplementation(function(this: any, resolve: any) {
        let data: any[] = [];
        if (tableName === "employees") {
          data = (globalThis as any).mockEmployees || [];
        } else if (tableName === "required_documents") {
          data = (globalThis as any).mockRequiredDocuments || [];
        } else if (tableName === "employee_documents") {
          data = (globalThis as any).mockEmployeeDocuments || [];
        } else if (tableName === "organization_memberships") {
          data = (globalThis as any).mockHrAdmins || [];
        } else if (tableName === "notification_outbox") {
          // Process outbox filters only for "channel === email" and "status === pending"
          data = ((globalThis as any).mockOutbox || []).filter(
            (o: any) => o.channel === "email" && o.status === "pending"
          );
        }
        resolve({ data, error: null });
      }),
    };
    return qb;
  }

  const client: any = {
    from: vi.fn().mockImplementation((tableName: string) => createQueryBuilder(tableName)),
    auth: {
      admin: {
        getUserById: vi.fn().mockImplementation((id: string) => {
          const email = id === "user-123" ? "john@example.com" : "hr-admin@example.com";
          return Promise.resolve({
            data: { user: { email } },
            error: null,
          });
        }),
      },
    },
  };

  (globalThis as any).mockSupabaseClient = client;
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => (globalThis as any).mockSupabaseClient),
}));

vi.mock("@hrms/platform", () => ({
  sendDocumentComplianceEmail: vi.fn().mockResolvedValue({ sent: true }),
}));

vi.mock("@/lib/entitlements", () => ({
  getEntitlements: vi.fn().mockResolvedValue({ tier: "professional" }),
}));

describe("Passport Expiry Cron Reminder", () => {
  beforeAll(() => {
    process.env.DEFAULT_ORGANIZATION_ID = "org-123";
  });

  beforeEach(() => {
    vi.clearAllMocks();

    (globalThis as any).mockEmployees = [
      { id: "emp-123", full_name: "John Doe", email: "john@example.com" },
    ];
    (globalThis as any).mockRequiredDocuments = [
      { name: "Passport", requires_expiry: true, warning_days: 60 },
    ];
    (globalThis as any).mockEmployeeDocuments = [];
    (globalThis as any).mockHrAdmins = [
      { user_id: "hr-admin-123" },
    ];
    (globalThis as any).mockMembership = { user_id: "user-123" };
    (globalThis as any).mockOutbox = [];
  });

  it("does not queue reminders when passport is valid (> 60 days to expiry)", async () => {
    (globalThis as any).mockEmployeeDocuments = [
      {
        employee_id: "emp-123",
        document_type: "Passport",
        expires_at: "2026-10-31", // expires in 73 days (from 2026-08-19)
        created_at: "2026-01-01T00:00:00Z",
        file_objects: { deleted_at: null },
      },
    ];

    const result = await scanAndQueueDocumentComplianceNotifications("2026-08-19");
    expect(result.queued).toBe(0);
    expect((globalThis as any).mockOutbox.length).toBe(0);
  });

  it("queues and sends expiry reminders to both Employee and HR when passport expires in exactly 30 days", async () => {
    (globalThis as any).mockEmployeeDocuments = [
      {
        employee_id: "emp-123",
        document_type: "Passport",
        expires_at: "2026-09-18", // expires in exactly 30 days (from 2026-08-19)
        created_at: "2026-01-01T00:00:00Z",
        file_objects: { deleted_at: null },
      },
    ];

    // 1. Scan and queue compliance notifications
    const scanResult = await scanAndQueueDocumentComplianceNotifications("2026-08-19");
    expect(scanResult.queued).toBe(2); // One for employee, one for HR admin
    expect((globalThis as any).mockOutbox.length).toBe(4); // 2 emails + 2 in-app notices

    // Verify outbox payloads
    const employeeNotice = (globalThis as any).mockOutbox.find(
      (o: any) => o.template === "document_compliance_employee" && o.channel === "email"
    );
    const hrNotice = (globalThis as any).mockOutbox.find(
      (o: any) => o.template === "document_compliance_hr" && o.channel === "email"
    );

    expect(employeeNotice).toBeDefined();
    expect(employeeNotice.recipient_user_id).toBe("user-123");
    expect(employeeNotice.payload.remainingDays).toBe(30);
    expect(employeeNotice.payload.documentType).toBe("Passport");

    expect(hrNotice).toBeDefined();
    expect(hrNotice.recipient_user_id).toBe("hr-admin-123");
    expect(hrNotice.payload.remainingDays).toBe(30);
    expect(hrNotice.payload.employeeName).toBe("John Doe");

    // 2. Process outbox (sending the emails)
    const sendResult = await processNotificationOutbox(10);
    expect(sendResult.processed).toBe(2);
    expect(sendResult.sent).toBe(2);

    // Assert mail functions are triggered with remainingDays
    expect(sendDocumentComplianceEmail).toHaveBeenCalledTimes(2);
    expect(sendDocumentComplianceEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        to: "john@example.com",
        recipientName: "John Doe",
        documentType: "Passport",
        remainingDays: 30,
        audience: "employee",
      })
    );
    expect(sendDocumentComplianceEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        to: "hr-admin@example.com",
        employeeName: "John Doe",
        documentType: "Passport",
        remainingDays: 30,
        audience: "hr",
      })
    );
  });

  it("formats the email subject and body correctly for Passport expiring in 30 days", () => {
    // Test the employee template output
    const employeeEmail = buildDocumentComplianceEmail({
      recipientName: "John Doe",
      employeeName: "John Doe",
      documentType: "Passport",
      status: "expiring",
      expiresAt: "2026-09-18",
      audience: "employee",
      remainingDays: 30,
    });

    expect(employeeEmail.subject).toBe("Action needed: Your passport expires in 30 days");
    expect(employeeEmail.text).toContain("Your Passport expires in 30 days.");
    expect(employeeEmail.html).toContain("Your <strong>Passport</strong> expires in 30 days.");

    // Test the HR template output
    const hrEmail = buildDocumentComplianceEmail({
      recipientName: "HR Administrator",
      employeeName: "John Doe",
      documentType: "Passport",
      status: "expiring",
      expiresAt: "2026-09-18",
      audience: "hr",
      remainingDays: 30,
    });

    expect(hrEmail.subject).toBe("John Doe — Passport expires in 30 days");
    expect(hrEmail.text).toContain("Their Passport expires in 30 days.");
    expect(hrEmail.html).toContain("Their <strong>Passport</strong> expires in 30 days.");
  });
});
