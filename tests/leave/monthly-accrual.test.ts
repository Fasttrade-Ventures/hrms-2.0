import { beforeEach, describe, expect, it, vi } from "vitest";
import { performMonthlyLeaveAccrual } from "@/lib/leave/accrual";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/audit/log-event", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/notifications/queue", () => ({
  queueNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/approvals/service", () => ({
  resolveUserIdForEmployee: vi.fn().mockResolvedValue("user-1"),
}));

function createChainableMock(resolvedData: any) {
  const chain: any = {
    eq: vi.fn(() => chain),
    then: (resolve: (val: any) => void) => resolve({ data: resolvedData, error: null }),
  };
  return chain;
}

describe("Monthly Leave Accrual Engine (performMonthlyLeaveAccrual)", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "leave_types") {
          return {
            select: vi.fn(() =>
              createChainableMock([
                {
                  id: "lt-1",
                  organization_id: "org-1",
                  name: "Annual Leave",
                  entitlement_days: 14,
                  monthly_accrual_rate: 1.17,
                  accrual_frequency: "monthly",
                },
                {
                  id: "lt-2",
                  organization_id: "org-1",
                  name: "Medical Leave",
                  entitlement_days: 12,
                  monthly_accrual_rate: 1.0,
                  accrual_frequency: "monthly",
                },
              ]),
            ),
          };
        }

        if (table === "employees") {
          return {
            select: vi.fn(() =>
              createChainableMock([
                {
                  id: "emp-1",
                  annual_leave_entitlement: 2.34,
                  annual_leave_carry_forward: 0,
                  status: "active",
                },
                {
                  id: "emp-2",
                  annual_leave_entitlement: 0,
                  annual_leave_carry_forward: 0,
                  status: "active",
                },
              ]),
            ),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }

        if (table === "leave_balance_audit_logs") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "log-1" },
                  error: null,
                }),
              })),
            })),
          };
        }

        return {};
      }),
    };
  });

  it("calculates and applies monthly accrual for active employees", async () => {
    const result = await performMonthlyLeaveAccrual({
      asOfDate: "2026-10-01",
      organizationId: "org-1",
      client: mockSupabase,
    });

    expect(result.processedCount).toBe(4); // 2 employees * 2 monthly leave types
    expect(result.skippedCount).toBe(0);
    expect(result.totalAccruedDays).toBe(4.34); // (1.17 + 1.0) * 2
    expect(result.auditLogIds.length).toBe(4);
  });

  it("is idempotent and skips already accrued records for the same month", async () => {
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "leave_types") {
        return {
          select: vi.fn(() =>
            createChainableMock([
              {
                id: "lt-1",
                organization_id: "org-1",
                name: "Annual Leave",
                entitlement_days: 14,
                monthly_accrual_rate: 1.17,
                accrual_frequency: "monthly",
              },
            ]),
          ),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn(() =>
            createChainableMock([
              {
                id: "emp-1",
                annual_leave_entitlement: 3.51,
                status: "active",
              },
            ]),
          ),
        };
      }

      if (table === "leave_balance_audit_logs") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-log-id" }, error: null }),
              }),
            }),
          })),
        };
      }

      return {};
    });

    const result = await performMonthlyLeaveAccrual({
      asOfDate: "2026-10-01",
      organizationId: "org-1",
      client: mockSupabase,
    });

    expect(result.processedCount).toBe(0);
    expect(result.skippedCount).toBe(1);
    expect(result.totalAccruedDays).toBe(0);
  });

  it("supports dryRun without committing database mutations", async () => {
    const updateSpy = vi.fn();
    mockSupabase.from = vi.fn((table: string) => {
      if (table === "leave_types") {
        return {
          select: vi.fn(() =>
            createChainableMock([
              {
                id: "lt-1",
                organization_id: "org-1",
                name: "Annual Leave",
                entitlement_days: 14,
                monthly_accrual_rate: 1.17,
                accrual_frequency: "monthly",
              },
            ]),
          ),
        };
      }

      if (table === "employees") {
        return {
          select: vi.fn(() =>
            createChainableMock([
              { id: "emp-1", annual_leave_entitlement: 1.17, status: "active" },
            ]),
          ),
          update: updateSpy,
        };
      }

      if (table === "leave_balance_audit_logs") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          })),
        };
      }

      return {};
    });

    const result = await performMonthlyLeaveAccrual({
      asOfDate: "2026-10-01",
      organizationId: "org-1",
      dryRun: true,
      client: mockSupabase,
    });

    expect(result.processedCount).toBe(1);
    expect(result.totalAccruedDays).toBe(1.17);
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
