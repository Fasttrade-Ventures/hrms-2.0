import { describe, expect, it, vi } from "vitest";

import {
  consumeReplacementCredits,
  getLinkedReplacementCredits,
  getReplacementCreditBalance,
  isReplacementLeaveType,
  restoreReplacementCredits,
} from "../../apps/web/src/lib/leave/replacement-credit";

describe("isReplacementLeaveType", () => {
  it("recognizes various replacement leave type names", () => {
    expect(isReplacementLeaveType("Replacement Leave")).toBe(true);
    expect(isReplacementLeaveType("replacement")).toBe(true);
    expect(isReplacementLeaveType("REPLACEMENT LEAVE (REST DAY)")).toBe(true);
    expect(isReplacementLeaveType("Replacement Credit")).toBe(true);
  });

  it("returns false for non-replacement leave types", () => {
    expect(isReplacementLeaveType("Annual Leave")).toBe(false);
    expect(isReplacementLeaveType("Medical Leave")).toBe(false);
    expect(isReplacementLeaveType("Hospitalization Leave")).toBe(false);
    expect(isReplacementLeaveType("Unpaid Leave")).toBe(false);
    expect(isReplacementLeaveType(null)).toBe(false);
    expect(isReplacementLeaveType(undefined)).toBe(false);
  });
});

describe("getReplacementCreditBalance", () => {
  it("computes approved credits, used days, and remaining balance", async () => {
    const mockCredits = [
      { id: "c1", credit_days: "1.00" },
      { id: "c2", credit_days: "1.00" },
    ];

    const mockUsages = [
      {
        id: "u1",
        days: "1.00",
        leave_request_id: "lr-1",
        leave_requests: { id: "lr-1", status: "approved" },
      },
      {
        id: "u2",
        days: "0.50",
        leave_request_id: "lr-2",
        leave_requests: { id: "lr-2", status: "pending" },
      },
    ];

    const mockClient = {
      from(table: string) {
        if (table === "replacement_credits") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ data: mockCredits, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === "replacement_credit_usages") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: mockUsages, error: null }),
              }),
            }),
          };
        }
        return {};
      },
    };

    const balance = await getReplacementCreditBalance(
      "org-1",
      "emp-1",
      mockClient as never,
    );

    expect(balance.totalApprovedCredits).toBe(2);
    expect(balance.usedDays).toBe(1);
    expect(balance.pendingDays).toBe(0.5);
    expect(balance.remainingDays).toBe(0.5);
  });
});

describe("consumeReplacementCredits (FIFO and partial accounting)", () => {
  it("allocates credits in FIFO order across multiple credit entries", async () => {
    const mockCredits = [
      { id: "c1", work_date: "2026-05-01", credit_days: "1.00", created_at: "2026-05-02T00:00:00Z" },
      { id: "c2", work_date: "2026-06-01", credit_days: "1.00", created_at: "2026-06-02T00:00:00Z" },
    ];

    // c1 already has 0.50 consumed by an approved request
    const mockExistingUsages = [
      {
        replacement_credit_id: "c1",
        days: "0.50",
        leave_requests: { status: "approved" },
      },
    ];

    const insertedUsages: Array<{
      organization_id: string;
      employee_id: string;
      replacement_credit_id: string;
      leave_request_id: string;
      days: number;
    }> = [];

    const mockClient = {
      from(table: string) {
        if (table === "replacement_credits") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => Promise.resolve({ data: mockCredits, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "replacement_credit_usages") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  neq: () => Promise.resolve({ data: mockExistingUsages, error: null }),
                }),
              }),
            }),
            insert: vi.fn((rows: typeof insertedUsages) => {
              insertedUsages.push(...rows);
              return Promise.resolve({ error: null });
            }),
          };
        }
        return {};
      },
    };

    // Request 1.0 day: should take remaining 0.5 from c1, and 0.5 from c2
    await consumeReplacementCredits({
      organizationId: "org-1",
      employeeId: "emp-1",
      leaveRequestId: "lr-new",
      days: 1.0,
      client: mockClient as never,
    });

    expect(insertedUsages).toHaveLength(2);
    expect(insertedUsages[0]).toEqual({
      organization_id: "org-1",
      employee_id: "emp-1",
      replacement_credit_id: "c1",
      leave_request_id: "lr-new",
      days: 0.5,
    });
    expect(insertedUsages[1]).toEqual({
      organization_id: "org-1",
      employee_id: "emp-1",
      replacement_credit_id: "c2",
      leave_request_id: "lr-new",
      days: 0.5,
    });
  });

  it("throws error when requested days exceed available credits", async () => {
    const mockCredits = [
      { id: "c1", work_date: "2026-05-01", credit_days: "1.00", created_at: "2026-05-02T00:00:00Z" },
    ];

    const mockClient = {
      from(table: string) {
        if (table === "replacement_credits") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    order: () => ({
                      order: () => Promise.resolve({ data: mockCredits, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "replacement_credit_usages") {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  neq: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      },
    };

    await expect(
      consumeReplacementCredits({
        organizationId: "org-1",
        employeeId: "emp-1",
        leaveRequestId: "lr-too-large",
        days: 2.0,
        client: mockClient as never,
      }),
    ).rejects.toThrow("Insufficient replacement credit balance. Requested: 2 day(s), available: 1 day(s).");
  });

  it("throws error when no approved credits exist", async () => {
    const mockClient = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    order: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      },
    };

    await expect(
      consumeReplacementCredits({
        organizationId: "org-1",
        employeeId: "emp-1",
        leaveRequestId: "lr-empty",
        days: 1.0,
        client: mockClient as never,
      }),
    ).rejects.toThrow("No approved replacement credits available to consume.");
  });
});

describe("restoreReplacementCredits", () => {
  it("deletes usage rows and returns total restored days", async () => {
    const mockUsages = [
      { id: "u1", days: "1.00", replacement_credit_id: "c1" },
      { id: "u2", days: "0.50", replacement_credit_id: "c2" },
    ];

    let deleteCalled = false;
    const mockClient = {
      from(table: string) {
        if (table === "replacement_credit_usages") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => Promise.resolve({ data: mockUsages, error: null }),
              }),
            }),
            delete: () => ({
              eq: () => ({
                eq: () => {
                  deleteCalled = true;
                  return Promise.resolve({ error: null });
                },
              }),
            }),
          };
        }
        return {};
      },
    };

    const result = await restoreReplacementCredits({
      organizationId: "org-1",
      leaveRequestId: "lr-to-cancel",
      client: mockClient as never,
    });

    expect(deleteCalled).toBe(true);
    expect(result.restoredDays).toBe(1.5);
  });

  it("returns 0 if no usages existed for leave request", async () => {
    const mockClient = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      },
    };

    const result = await restoreReplacementCredits({
      organizationId: "org-1",
      leaveRequestId: "lr-non-replacement",
      client: mockClient as never,
    });

    expect(result.restoredDays).toBe(0);
  });
});

describe("getLinkedReplacementCredits", () => {
  it("formats linked credits correctly", async () => {
    const mockData = [
      {
        id: "u1",
        days: "1.00",
        replacement_credit_id: "c1",
        replacement_credits: {
          id: "c1",
          work_date: "2026-05-01",
          credit_days: "1.00",
          description: "Sunday system upgrade",
        },
      },
    ];

    const mockClient = {
      from() {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockData, error: null }),
            }),
          }),
        };
      },
    };

    const linked = await getLinkedReplacementCredits(
      "org-1",
      "lr-1",
      mockClient as never,
    );

    expect(linked).toHaveLength(1);
    expect(linked[0]).toEqual({
      id: "u1",
      replacementCreditId: "c1",
      workDate: "2026-05-01",
      creditDays: 1,
      consumedDays: 1,
      description: "Sunday system upgrade",
    });
  });
});
