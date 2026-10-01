import { beforeEach, describe, expect, it, vi } from "vitest";
import { listLeaveBalanceAuditLogs, recordLeaveBalanceAdjustment } from "@/lib/leave/audit";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/organization-context", () => ({
  requireOrganizationId: vi.fn().mockResolvedValue("org-1"),
}));

describe("Leave Balance Audit Log Service", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists audit logs with correct formatting and pagination", async () => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "leave_balance_audit_logs") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "log-1",
                        organization_id: "org-1",
                        employee_id: "emp-1",
                        leave_type_id: "lt-1",
                        action_type: "monthly_accrual",
                        previous_balance: 10,
                        delta_days: 1.17,
                        new_balance: 11.17,
                        effective_date: "2026-10-01",
                        reason: "Monthly accrual",
                        actor_user_id: null,
                        created_at: "2026-10-01T00:00:00Z",
                        employees: { full_name: "Alice Tan", employee_number: "EMP001" },
                        leave_types: { name: "Annual Leave" },
                      },
                    ],
                    count: 1,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    const result = await listLeaveBalanceAuditLogs({
      organizationId: "org-1",
      client: mockSupabase,
    });

    expect(result.rows.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.rows[0].employeeName).toBe("Alice Tan");
    expect(result.rows[0].deltaDays).toBe(1.17);
    expect(result.rows[0].newBalance).toBe(11.17);
  });

  it("records manual adjustment and verifies reason validation", async () => {
    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "leave_types") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "lt-1", name: "Annual Leave", entitlement_days: 14 },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === "employees") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "emp-1", annual_leave_entitlement: 10, annual_leave_carry_forward: 0 },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }

        if (table === "leave_balance_audit_logs") {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: "adj-log-1", created_at: "2026-10-01T00:00:00Z" },
                  error: null,
                }),
              }),
            }),
          };
        }

        return {};
      }),
    };

    // Valid adjustment
    const adjustment = await recordLeaveBalanceAdjustment({
      organizationId: "org-1",
      employeeId: "emp-1",
      leaveTypeId: "lt-1",
      deltaDays: 2.5,
      reason: "Correction of tenure adjustment",
      client: mockSupabase,
    });

    expect(adjustment.newBalance).toBe(12.5);
    expect(adjustment.deltaDays).toBe(2.5);
    expect(adjustment.actionType).toBe("manual_adjustment");

    // Invalid adjustment (missing/short reason)
    await expect(
      recordLeaveBalanceAdjustment({
        organizationId: "org-1",
        employeeId: "emp-1",
        leaveTypeId: "lt-1",
        deltaDays: 2,
        reason: "no",
        client: mockSupabase,
      }),
    ).rejects.toThrow(/reason/i);
  });
});
