import Link from "next/link";
import { isSaasMode } from "@hrms/platform";

import { getOrganizationSubscription } from "@/lib/billing/subscriptions";
import { createAdminClient } from "@/lib/supabase/admin";

function formatDay(value: string): string {
  const date = new Date(value);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function graceEndsOn(periodEnd: string): string {
  const graceDays = Number(process.env.BILLING_PAST_DUE_GRACE_DAYS ?? "7");
  const end = new Date(periodEnd);
  end.setUTCDate(end.getUTCDate() + graceDays);
  return formatDay(end.toISOString());
}

export async function BillingTrialBanner({ organizationId }: { organizationId: string }) {
  if (!isSaasMode() || process.env.BILLING_ENABLED !== "true") return null;

  const admin = createAdminClient();
  const subscription = await getOrganizationSubscription(admin, organizationId);
  if (!subscription) return null;

  if (subscription.status === "trialing" && subscription.trial_ends_at) {
    const trialOpen = new Date(subscription.trial_ends_at) >= new Date();
    if (trialOpen) {
      return (
        <div className="border-b border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-2 text-center text-sm">
          Trial ends {formatDay(subscription.trial_ends_at)}. Pay to keep{" "}
          {subscription.billing_plans.name} after the trial —{" "}
          <Link className="font-medium underline" href="/owner/billing">
            Billing
          </Link>
        </div>
      );
    }
  }

  if (subscription.status === "past_due" || (subscription.status === "trialing" && subscription.trial_ends_at)) {
    const until = subscription.current_period_end
      ? ` You can still pay until ${graceEndsOn(subscription.current_period_end)}.`
      : "";
    return (
        <div className="border-b border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-2 text-center text-sm">
          This workspace is read-only until the subscription is paid.{until}{" "}
          <Link className="font-medium underline" href="/owner/billing">
            Pay now
          </Link>
        </div>
    );
  }

  if (subscription.status === "canceled") {
    return (
      <div className="border-b border-[var(--status-info-border)] bg-[var(--status-info-bg)] px-4 py-2 text-center text-sm">
        This subscription has ended. Pay to start it again —{" "}
        <Link className="font-medium underline" href="/owner/billing">
          Billing
        </Link>
      </div>
    );
  }

  return null;
}
