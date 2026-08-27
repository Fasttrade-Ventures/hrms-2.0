import type { ProductTier } from "@hrms/platform";
import type { SupabaseClient } from "@supabase/supabase-js";

import { relationOne } from "@/lib/supabase/relation-one";

const TRIAL_ENTITLEMENT_TIER: ProductTier = "professional";

export async function syncEntitlementsFromSubscription(
  admin: SupabaseClient,
  organizationId: string,
): Promise<ProductTier> {
  const { data: subscription, error } = await admin
    .from("organization_billing_subscriptions")
    .select("status, billing_plans(tier)")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  let tier: ProductTier = "core";
  const plan = relationOne(subscription?.billing_plans as { tier: ProductTier } | Array<{ tier: ProductTier }> | null);
  if (plan) tier = plan.tier;
  if (subscription?.status === "trialing") {
    tier = TRIAL_ENTITLEMENT_TIER;
  }

  const { error: updateError } = await admin
    .from("organizations")
    .update({ product_tier: tier, updated_at: new Date().toISOString() })
    .eq("id", organizationId);

  if (updateError) throw new Error(updateError.message);
  return tier;
}
