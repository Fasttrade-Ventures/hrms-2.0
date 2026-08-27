import { describe, expect, it } from "vitest";

import { evaluateSubscriptionGate } from "../../apps/web/src/lib/billing/subscription-gate";

describe("evaluateSubscriptionGate", () => {
  const now = new Date("2026-08-28T00:00:00.000Z");

  it("allows when billing disabled (zero-cost path)", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: false,
      impersonating: false,
      status: "canceled",
      trialEndsAt: null,
      currentPeriodEnd: null,
      graceDays: 7,
      now,
    });
    expect(result).toEqual({ allowed: true, reason: "billing_disabled" });
  });

  it("allows impersonation for platform support", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: true,
      impersonating: true,
      status: "canceled",
      trialEndsAt: null,
      currentPeriodEnd: null,
      graceDays: 7,
      now,
    });
    expect(result.allowed).toBe(true);
  });

  it("allows active trial", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: true,
      impersonating: false,
      status: "trialing",
      trialEndsAt: "2026-09-01T00:00:00.000Z",
      currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      graceDays: 7,
      now,
    });
    expect(result).toEqual({ allowed: true, reason: "trialing" });
  });

  it("blocks expired trial", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: true,
      impersonating: false,
      status: "trialing",
      trialEndsAt: "2026-08-01T00:00:00.000Z",
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      graceDays: 7,
      now,
    });
    expect(result.allowed).toBe(false);
  });

  it("allows past_due within grace", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: true,
      impersonating: false,
      status: "past_due",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-25T00:00:00.000Z",
      graceDays: 7,
      now,
    });
    expect(result).toEqual({ allowed: true, reason: "past_due_grace" });
  });

  it("blocks past_due after grace", () => {
    const result = evaluateSubscriptionGate({
      billingEnabled: true,
      impersonating: false,
      status: "past_due",
      trialEndsAt: null,
      currentPeriodEnd: "2026-08-01T00:00:00.000Z",
      graceDays: 7,
      now,
    });
    expect(result.allowed).toBe(false);
  });
});
