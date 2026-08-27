import Link from "next/link";

import { StatusPill } from "@hrms/ui";
import { isSaasMode } from "@hrms/platform";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { BillingPanel } from "@/components/owner/billing-panel";
import { getOwnerBillingSummary, payNowAction } from "@/app/(owner)/owner/billing/actions";
import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";

export default async function OwnerBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  await requireRole("organization_owner");
  const organizationId = await requireOrganizationId();
  const params = await searchParams;

  if (!isSaasMode()) {
    return (
      <div className="space-y-4">
        <PortalPageHeader
          description="Standalone deployments use offline billing."
          title="Billing"
        />
        <p className="text-sm text-[var(--foreground-muted)]">
          Contact your account manager for plan changes.
        </p>
      </div>
    );
  }

  const summary = await getOwnerBillingSummary(organizationId);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Manage your HRMS subscription and payment history."
        title="Billing"
      />

      {params.paid === "1" ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-4 py-3 text-sm">
          Payment received — your subscription will update shortly.{" "}
          <Link className="underline" href="/owner/billing">
            Refresh
          </Link>
        </div>
      ) : null}

      {summary ? (
        <BillingPanel payNowAction={payNowAction} summary={summary} />
      ) : (
        <p className="text-sm text-[var(--foreground-muted)]">
          No subscription record yet.{" "}
          <StatusPill label="Setup pending" tone="neutral" />
        </p>
      )}
    </div>
  );
}
