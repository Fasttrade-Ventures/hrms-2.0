import { describe, expect, it } from "vitest";

import { calculateSubscriptionAmount } from "../../apps/web/src/lib/billing/calculate-invoice";

describe("calculateSubscriptionAmount", () => {
  it("charges base only for 10 staff on monthly Professional", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "month",
      activeEmployees: 10,
    });
    expect(result.baseSen).toBe(12900);
    expect(result.overageCount).toBe(0);
    expect(result.subtotalSen).toBe(12900);
    expect(result.sstSen).toBe(1032);
    expect(result.totalSen).toBe(13932);
  });

  it("adds overage for 20 staff on monthly Professional (RM 249)", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "month",
      activeEmployees: 20,
    });
    expect(result.overageCount).toBe(10);
    expect(result.subtotalSen).toBe(12900 + 10 * 1200);
    expect(result.subtotalSen).toBe(24900);
    expect(result.totalSen).toBe(24900 + Math.round(24900 * 0.08));
  });

  it("annual subscription excludes overage from base invoice", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "year",
      activeEmployees: 20,
    });
    expect(result.baseSen).toBe(129000);
    expect(result.overageSen).toBe(0);
    expect(result.subtotalSen).toBe(129000);
  });

  it("annual overage invoice bills monthly overage only", () => {
    const result = calculateSubscriptionAmount({
      tier: "professional",
      interval: "year",
      activeEmployees: 20,
      invoiceType: "overage",
    });
    expect(result.baseSen).toBe(0);
    expect(result.overageSen).toBe(12000);
    expect(result.subtotalSen).toBe(12000);
  });

  it("scales for 50 staff on Enterprise monthly", () => {
    const result = calculateSubscriptionAmount({
      tier: "enterprise",
      interval: "month",
      activeEmployees: 50,
    });
    expect(result.overageCount).toBe(40);
    expect(result.subtotalSen).toBe(17900 + 40 * 1700);
  });
});
