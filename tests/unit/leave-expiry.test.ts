import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock global store for database records
const mockStore = {
  leaveRequests: [] as any[],
  approvalRequests: [] as any[],
  approvalSteps: [] as any[],
  auditLogs: [] as any[],
  notifications: [] as any[],
};

vi.hoisted(() => {
  (globalThis as any).mockStore = {
    leaveRequests: [],
    approvalRequests: [],
    approvalSteps: [],
    auditLogs: [],
    notifications: [],
  };
});

// Mock Supabase admin client
vi.mock("@/lib/supabase/admin", () => {
  return {
    createAdminClient: () => {
      const store = (globalThis as any).mockStore;
      return {
        from: (table: string) => {
          let selectedFields = "*";
          const filters: Array<(row: any) => boolean> = [];
          let updateData: any = null;

          const builder: any = {
            select: vi.fn().mockImplementation((fields: string) => {
              selectedFields = fields;
              return builder;
            }),
            eq: vi.fn().mockImplementation((field: string, val: any) => {
              filters.push((row: any) => row[field] === val);
              return builder;
            }),
            lt: vi.fn().mockImplementation((field: string, val: any) => {
              filters.push((row: any) => row[field] < val);
              return builder;
            }),
            update: vi.fn().mockImplementation((data: any) => {
              updateData = data;
              return builder;
            }),
            maybeSingle: vi.fn().mockImplementation(async () => {
              const records: any[] = store[table === "approval_requests" ? "approvalRequests" : "leaveRequests"] || [];
              const matched = records.find((row) => filters.every((f) => f(row)));
              return { data: matched || null, error: null };
            }),
            then: (resolve: any) => {
              if (table === "leave_requests") {
                if (updateData) {
                  // Apply update to matching records
                  store.leaveRequests.forEach((row: any) => {
                    if (filters.every((f) => f(row))) {
                      Object.assign(row, updateData);
                    }
                  });
                  return resolve({ data: null, error: null });
                }
                const matched = store.leaveRequests.filter((row: any) => filters.every((f) => f(row)));
                return resolve({ data: matched, error: null });
              }

              if (table === "approval_requests") {
                if (updateData) {
                  store.approvalRequests.forEach((row: any) => {
                    if (filters.every((f) => f(row))) {
                      Object.assign(row, updateData);
                    }
                  });
                  return resolve({ data: null, error: null });
                }
              }

              if (table === "approval_steps") {
                if (updateData) {
                  store.approvalSteps.forEach((row: any) => {
                    if (filters.every((f) => f(row))) {
                      Object.assign(row, updateData);
                    }
                  });
                  return resolve({ data: null, error: null });
                }
              }

              return resolve({ data: [], error: null });
            },
          };

          return builder;
        },
      };
    },
  };
});

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: vi.fn().mockImplementation(async (event: any) => {
    (globalThis as any).mockStore.auditLogs.push(event);
  }),
}));

vi.mock("@/lib/notifications/queue", () => ({
  queueNotification: vi.fn().mockImplementation(async (notif: any) => {
    (globalThis as any).mockStore.notifications.push(notif);
  }),
}));

vi.mock("@/lib/approvals/service", () => ({
  resolveUserIdForEmployee: vi.fn().mockResolvedValue("user-emp-1"),
}));

vi.mock("@/lib/integrations/webhooks/emit", () => ({
  emitLeaveWebhook: vi.fn().mockResolvedValue(undefined),
}));

import { expireOverduePendingLeaves } from "../../apps/web/src/lib/leave/expiry";

describe("Leave auto-expiry for overdue pending requests", () => {
  beforeEach(() => {
    const store = (globalThis as any).mockStore;
    store.leaveRequests = [
      {
        id: "leave-past-1",
        organization_id: "org-1",
        employee_id: "emp-1",
        leave_type_id: "type-annual",
        start_date: "2026-08-01",
        end_date: "2026-08-05",
        days: 5,
        status: "pending",
        approval_request_id: "app-1",
      },
      {
        id: "leave-past-2",
        organization_id: "org-1",
        employee_id: "emp-2",
        leave_type_id: "type-annual",
        start_date: "2026-08-10",
        end_date: "2026-08-12",
        days: 3,
        status: "pending",
        approval_request_id: "app-2",
      },
      {
        id: "leave-future",
        organization_id: "org-1",
        employee_id: "emp-1",
        leave_type_id: "type-annual",
        start_date: "2026-09-15",
        end_date: "2026-09-20",
        days: 5,
        status: "pending",
        approval_request_id: "app-3",
      },
      {
        id: "leave-already-approved",
        organization_id: "org-1",
        employee_id: "emp-1",
        leave_type_id: "type-annual",
        start_date: "2026-08-01",
        end_date: "2026-08-05",
        days: 5,
        status: "approved",
        approval_request_id: "app-4",
      },
    ];

    store.approvalRequests = [
      { id: "app-1", status: "pending", payload: {} },
      { id: "app-2", status: "pending", payload: {} },
      { id: "app-3", status: "pending", payload: {} },
      { id: "app-4", status: "approved", payload: {} },
    ];

    store.approvalSteps = [
      { id: "step-1", approval_request_id: "app-1", status: "pending" },
      { id: "step-2", approval_request_id: "app-2", status: "pending" },
      { id: "step-3", approval_request_id: "app-3", status: "pending" },
    ];

    store.auditLogs = [];
    store.notifications = [];
  });

  it("expires overdue pending leave requests whose end_date has passed", async () => {
    const result = await expireOverduePendingLeaves({ asOfDate: "2026-09-08" });

    expect(result.expiredCount).toBe(2);
    expect(result.expiredRequestIds).toContain("leave-past-1");
    expect(result.expiredRequestIds).toContain("leave-past-2");

    const store = (globalThis as any).mockStore;
    const leave1 = store.leaveRequests.find((r: any) => r.id === "leave-past-1");
    const leave2 = store.leaveRequests.find((r: any) => r.id === "leave-past-2");
    const leaveFuture = store.leaveRequests.find((r: any) => r.id === "leave-future");
    const leaveApproved = store.leaveRequests.find((r: any) => r.id === "leave-already-approved");

    expect(leave1.status).toBe("cancelled");
    expect(leave2.status).toBe("cancelled");
    expect(leaveFuture.status).toBe("pending");
    expect(leaveApproved.status).toBe("approved");

    // Approval request and steps marked as cancelled
    const app1 = store.approvalRequests.find((a: any) => a.id === "app-1");
    expect(app1.status).toBe("cancelled");
    expect(app1.payload.cancellationReason).toBe("Expired: leave dates passed without manager approval");

    const step1 = store.approvalSteps.find((s: any) => s.id === "step-1");
    expect(step1.status).toBe("cancelled");

    // Audit logs recorded
    expect(store.auditLogs.length).toBe(2);
    expect(store.auditLogs[0].action).toBe("leave.expired");
    expect(store.auditLogs[0].metadata.reason).toContain("Expired");

    // Notifications queued for employees
    expect(store.notifications.length).toBe(2);
    expect(store.notifications[0].template).toBe("approval.cancel");
    expect(store.notifications[0].payload.reason).toContain("Expired");
  });

  it("filters by employeeId when specified", async () => {
    const result = await expireOverduePendingLeaves({
      employeeId: "emp-1",
      asOfDate: "2026-09-08",
    });

    expect(result.expiredCount).toBe(1);
    expect(result.expiredRequestIds).toEqual(["leave-past-1"]);

    const store = (globalThis as any).mockStore;
    const leave1 = store.leaveRequests.find((r: any) => r.id === "leave-past-1");
    const leave2 = store.leaveRequests.find((r: any) => r.id === "leave-past-2");

    expect(leave1.status).toBe("cancelled");
    // emp-2 was not touched
    expect(leave2.status).toBe("pending");
  });

  it("returns zero expired count when there are no overdue pending requests", async () => {
    const result = await expireOverduePendingLeaves({ asOfDate: "2026-07-01" });
    expect(result.expiredCount).toBe(0);
    expect(result.expiredRequestIds).toEqual([]);
  });
});
