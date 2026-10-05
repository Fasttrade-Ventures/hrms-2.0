import { describe, expect, it } from "vitest";

import {
  daysUntilCutoff,
  leaveBalanceReminderKey,
  leaveBalanceReminderMessage,
  planLeaveBalanceReminder,
  type LeaveReminderCandidate,
} from "@/lib/leave/balance-reminders";

function candidate(overrides: Partial<LeaveReminderCandidate> = {}): LeaveReminderCandidate {
  return {
    organizationId: "org-1",
    employeeId: "emp-1",
    leaveTypeId: "type-1",
    leaveTypeName: "Annual Leave",
    isUnpaid: false,
    isReplacement: false,
    entitlementDays: 14,
    usedDays: 0,
    pendingDays: 0,
    carryForwardDays: 0,
    carryForwardEnabled: false,
    carryForwardCutoff: null,
    asOfDate: "2026-06-01",
    ...overrides,
  };
}

describe("planLeaveBalanceReminder", () => {
  it("reminds when remaining days are 3 or below", () => {
    const plan = planLeaveBalanceReminder(
      candidate({ entitlementDays: 8, usedDays: 5, pendingDays: 0 }),
    );

    expect(plan?.reason).toBe("low_balance");
    expect(plan?.remainingDays).toBe(3);
    expect(plan?.idempotencyKey).toBe("leave-balance-reminder:org-1:emp-1:type-1:2026-06");
  });

  it("does not remind when more than 3 days remain and nothing is expiring", () => {
    expect(planLeaveBalanceReminder(candidate({ entitlementDays: 8, usedDays: 4 }))).toBeNull();
  });

  it("skips unpaid and replacement leave", () => {
    expect(planLeaveBalanceReminder(candidate({ isUnpaid: true, usedDays: 14 }))).toBeNull();
    expect(planLeaveBalanceReminder(candidate({ isReplacement: true, usedDays: 14 }))).toBeNull();
  });

  it("reminds when carry-forward leave expires within 30 days", () => {
    const plan = planLeaveBalanceReminder(
      candidate({
        entitlementDays: 16,
        carryForwardDays: 2,
        carryForwardEnabled: true,
        carryForwardCutoff: "06-30",
        asOfDate: "2026-06-10",
      }),
    );

    expect(plan?.reason).toBe("expiring");
    expect(plan?.daysUntilExpiry).toBe(20);
  });

  it("does not remind when the cutoff is more than 30 days away or already passed", () => {
    expect(daysUntilCutoff("2026-05-01", "06-30")).toBeNull();
    expect(daysUntilCutoff("2026-07-01", "06-30")).toBeNull();
    expect(
      planLeaveBalanceReminder(
        candidate({
          carryForwardDays: 4,
          carryForwardEnabled: true,
          carryForwardCutoff: "06-30",
          asOfDate: "2026-05-01",
        }),
      ),
    ).toBeNull();
  });

  it("sends one combined reminder when balance is low and carry-forward is expiring", () => {
    const plan = planLeaveBalanceReminder(
      candidate({
        entitlementDays: 4,
        usedDays: 2,
        carryForwardDays: 2,
        carryForwardEnabled: true,
        carryForwardCutoff: "06-20",
        asOfDate: "2026-06-01",
      }),
    );

    expect(plan?.reason).toBe("low_and_expiring");
    expect(plan?.remainingDays).toBe(2);
    expect(leaveBalanceReminderMessage(plan!)).toContain("2 day(s) left");
    expect(leaveBalanceReminderKey("org-1", "emp-1", "type-1", "2026-06-28")).toBe(
      leaveBalanceReminderKey("org-1", "emp-1", "type-1", "2026-06-01"),
    );
  });
});
