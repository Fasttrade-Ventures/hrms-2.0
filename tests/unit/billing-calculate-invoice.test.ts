import { describe, expect, it } from "vitest";

import { calculateSubscriptionAmount } from "../../apps/web/src/lib/billing/calculate-invoice";

describe("calculateSubscriptionAmount", () => {
  it("charges base only for 10 staff on monthly Professional", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "month",
      activeEmployees: 10,
    });
    expect(result.baseSen).toBe(24900);
    expect(result.overageCount).toBe(0);
    expect(result.subtotalSen).toBe(24900);
    expect(result.sstSen).toBe(1992);
    expect(result.totalSen).toBe(26892);
  });

  it("adds overage for 20 staff on monthly Professional (RM 249)", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "month",
      activeEmployees: 20,
    });
    expect(result.overageCount).toBe(10);
    expect(result.subtotalSen).toBe(24900 + 10 * 1800);
    expect(result.totalSen).toBe(42900 + Math.round(42900 * 0.08));
  });

  it("annual subscription excludes overage from base invoice", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "year",
      activeEmployees: 20,
    });
    expect(result.baseSen).toBe(249000);
    expect(result.overageSen).toBe(0);
    expect(result.subtotalSen).toBe(249000);
  });

  it("annual overage invoice bills monthly overage only", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "year",
      activeEmployees: 20,
      invoiceType: "overage",
    });
    expect(result.baseSen).toBe(0);
    expect(result.overageSen).toBe(18000);
    expect(result.subtotalSen).toBe(18000);
  });

  it("scales for 50 staff on Enterprise monthly", () => {
    const result = calculateSubscriptionAmount({
      tier: "enterprise",
      interval: "month",
      activeEmployees: 50,
    });
    expect(result.overageCount).toBe(40);
    expect(result.subtotalSen).toBe(44900 + 40 * 2900);
  });
});
