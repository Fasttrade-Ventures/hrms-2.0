import Link from "next/link";
import { isSaasMode } from "@hrms/platform";

import { getOrganizationSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function BillingTrialBanner({ organizationId }: { organizationId: string }) {
  if (!isSaasMode() || process.env.BILLING_ENABLED !== "true") return null;

  const admin = createAdminClient();
  const subscription = await getOrganizationSubscription(admin, organizationId);

  if (!subscription || subscription.status !== "trialing" || !subscription.trial_ends_at) {
    return null;
  }

  const trialEnd = new Date(subscription.trial_ends_at).toLocaleDateString("en-MY");

  return (
    <div className="border-b border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-2 text-center text-sm">
      Trial ends {trialEnd}. Add payment to keep {subscription.billing_plans.name} after trial —{" "}
      <Link className="font-medium underline" href="/owner/billing">
        Billing
      </Link>
    </div>
  );
}
