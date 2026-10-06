import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@hrms/ui";

import { ApprovalTimeline } from "@/components/employee/approval-timeline";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  RequestStatusPill,
} from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getClaim, getApprovalTimeline } from "@/lib/employee/requests";
import { requireModule } from "@/lib/entitlements";

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  await requireModule("claims");
  const { requestId } = await params;
  const request = await getClaim(requestId);

  if (!request) {
    notFound();
  }

  const timeline = request.approvalRequestId
    ? await getApprovalTimeline(request.approvalRequestId).catch(() => [])
    : [];

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/employee/claims"
          >
            Back to claims
          </Link>
        }
        description={`Submitted ${formatDateTime(request.createdAt)}`}
        title={`Claim: ${request.claimTypeName}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Status</p>
          <div className="mt-2">
            <RequestStatusPill status={request.status} />
          </div>
        </div>
        <StatCard label="Amount" value={formatCurrency(request.amount)} />
        <StatCard label={request.isMileage ? "Travel date" : "Receipt date"} value={formatDate(request.receiptDate)} />
        {request.isMileage && request.distanceKm != null && (
          <StatCard label="Distance" value={`${request.distanceKm} km`} />
        )}
        {request.isMileage && request.ratePerKm != null && (
          <StatCard label="Applied rate" value={`RM ${request.ratePerKm.toFixed(2)} / km`} />
        )}
      </div>

      {request.isMileage && (request.origin || request.destination) && (
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Trip itinerary</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
              <span className="text-xs text-[var(--foreground-muted)]">Origin</span>
              <p className="mt-1 font-medium text-[var(--foreground-primary)]">{request.origin || "-"}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3">
              <span className="text-xs text-[var(--foreground-muted)]">Destination</span>
              <p className="mt-1 font-medium text-[var(--foreground-primary)]">{request.destination || "-"}</p>
            </div>
          </div>
        </section>
      )}

      <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Description</h2>
        <p className="text-sm text-[var(--foreground-primary)]">
          {request.description?.trim() || "No description provided."}
        </p>
      </section>

      {timeline.length > 0 && (
        <ApprovalTimeline steps={timeline} />
      )}
    </div>
  );
}
