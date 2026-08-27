import { cache } from "react";

import { getImpersonationOrgId } from "@/lib/platform/impersonation-cookie";
import { createAdminClient } from "@/lib/supabase/admin";

function billingEnabled(): boolean {
  return process.env.DEPLOYMENT_MODE === "saas" && process.env.BILLING_ENABLED === "true";
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export type SubscriptionGateResult =
  | { allowed: true; reason: "billing_disabled" | "impersonating" | "no_subscription" | "trialing" | "active" | "past_due_grace" }
  | { allowed: false; reason: "trial_expired" | "past_due" | "canceled" | "paused" | "unknown" };

/**
 * Pure status evaluation (unit-testable). Used by the write gate.
 */
export function evaluateSubscriptionGate(input: {
  billingEnabled: boolean;
  impersonating: boolean;
  status: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  graceDays: number;
  now?: Date;
}): SubscriptionGateResult {
  if (!input.billingEnabled) return { allowed: true, reason: "billing_disabled" };
  if (input.impersonating) return { allowed: true, reason: "impersonating" };
  if (!input.status) return { allowed: true, reason: "no_subscription" };

  const now = input.now ?? new Date();

  if (input.status === "trialing") {
    if (input.trialEndsAt && new Date(input.trialEndsAt) >= now) {
      return { allowed: true, reason: "trialing" };
    }
    return { allowed: false, reason: "trial_expired" };
  }

  if (input.status === "active") return { allowed: true, reason: "active" };

  if (input.status === "past_due" && input.currentPeriodEnd) {
    const graceEnds = addDays(new Date(input.currentPeriodEnd), input.graceDays);
    if (graceEnds >= now) return { allowed: true, reason: "past_due_grace" };
    return { allowed: false, reason: "past_due" };
  }

  if (input.status === "canceled") return { allowed: false, reason: "canceled" };
  if (input.status === "paused") return { allowed: false, reason: "paused" };
  return { allowed: false, reason: "unknown" };
}

/** One lightweight status fetch per request (React cache). */
const loadSubscriptionStatus = cache(async (organizationId: string) => {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_billing_subscriptions")
    .select("status, trial_ends_at, current_period_end")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as {
    status: string;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
});

/**
 * Throws when SaaS billing is enabled and the org is outside trial/active/grace.
 * No-op when billing is off (standalone or BILLING_ENABLED≠true) — zero DB cost.
 */
export async function requireActiveSubscription(organizationId: string): Promise<void> {
  if (!billingEnabled()) return;

  let impersonating = false;
  try {
    impersonating = Boolean(await getImpersonationOrgId());
  } catch {
    impersonating = false;
  }

  if (impersonating) return;

  const row = await loadSubscriptionStatus(organizationId);
  const graceDays = Number(process.env.BILLING_PAST_DUE_GRACE_DAYS ?? "7");
  const result = evaluateSubscriptionGate({
    billingEnabled: true,
    impersonating: false,
    status: row?.status ?? null,
    trialEndsAt: row?.trial_ends_at ?? null,
    currentPeriodEnd: row?.current_period_end ?? null,
    graceDays,
  });

  if (!result.allowed) {
    throw new Error("Subscription inactive. Update billing at /owner/billing.");
  }
}
