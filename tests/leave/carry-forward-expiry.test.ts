import { beforeEach, describe, expect, it, vi } from "vitest";
import { performYearEndCarryForward, performCarryForwardExpiry } from "@/lib/leave/rollover";

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
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    then: (resolve: (val: any) => void) => resolve({ data: resolvedData, error: null }),
  };
  return chain;
}

describe("Year-End Carry Forward & Expiry Engine", () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("performYearEndCarryForward", () => {
    it("caps carried days at max_carry_forward_days and forfeits excess unused balance", async () => {
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
                    carry_forward_enabled: true,
                    max_carry_forward_days: 5,
                    accrual_frequency: "none",
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
                    annual_leave_entitlement: 14,
                    annual_leave_carry_forward: 0,
                    status: "active",
                  },
                ]),
              ),
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            };
          }

          if (table === "leave_requests") {
            return {
              select: vi.fn(() =>
                createChainableMock([
                  // Employee used only 4 days out of 14, leaving 10 days unused
                  { days: 4 },
                ]),
              ),
            };
          }

          if (table === "leave_balance_audit_logs") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "log-cf-1" },
                    error: null,
                  }),
                }),
              }),
            };
          }

          return {};
        }),
      };

      const result = await performYearEndCarryForward({
        targetYear: 2027,
        organizationId: "org-1",
        client: mockSupabase,
      });

      expect(result.processedCount).toBe(1);
      expect(result.totalCarriedDays).toBe(5); // Capped at max 5 days
      expect(result.totalForfeitedDays).toBe(5); // 10 remaining - 5 carried = 5 forfeited
      expect(result.auditLogIds.length).toBeGreaterThan(0);
    });
  });

  describe("performCarryForwardExpiry", () => {
    it("expires remaining unutilized carry-forward balance on or after the cutoff date", async () => {
      const updateSpy = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

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
                    carry_forward_enabled: true,
                    carry_forward_expiry_cutoff_date: "06-30",
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
                    annual_leave_carry_forward: 3.5,
                    status: "active",
                  },
                ]),
              ),
              update: updateSpy,
            };
          }

          if (table === "leave_balance_audit_logs") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "log-exp-1" },
                    error: null,
                  }),
                }),
              }),
            };
          }

          return {};
        }),
      };

      const result = await performCarryForwardExpiry({
        asOfDate: "2026-07-01", // Past 06-30 cutoff
        organizationId: "org-1",
        client: mockSupabase,
      });

      expect(result.expiredCount).toBe(1);
      expect(result.totalExpiredDays).toBe(3.5);
      expect(updateSpy).toHaveBeenCalledWith({ annual_leave_carry_forward: 0 });
    });

    it("does not expire carry-forward before the cutoff date", async () => {
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
                    carry_forward_enabled: true,
                    carry_forward_expiry_cutoff_date: "06-30",
                  },
                ]),
              ),
            };
          }
          return {};
        }),
      };

      const result = await performCarryForwardExpiry({
        asOfDate: "2026-05-15", // Before 06-30 cutoff
        organizationId: "org-1",
        client: mockSupabase,
      });

      expect(result.expiredCount).toBe(0);
      expect(result.totalExpiredDays).toBe(0);
    });
  });
});
