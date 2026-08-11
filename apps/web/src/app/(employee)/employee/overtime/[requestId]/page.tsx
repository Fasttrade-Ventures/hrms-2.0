import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@hrms/ui";

import { ApprovalTimeline } from "@/components/employee/approval-timeline";
import {
  formatDate,
  formatDateTime,
  RequestStatusPill,
} from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getOvertimeRequest, getApprovalTimeline } from "@/lib/employee/requests";

export default async function OvertimeDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const request = await getOvertimeRequest(requestId);

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
            href="/employee/overtime"
          >
            Back to overtime
          </Link>
        }
        description={`Submitted ${formatDateTime(request.createdAt)}`}
        title="Overtime request"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Status</p>
          <div className="mt-2">
            <RequestStatusPill status={request.status} />
          </div>
        </div>
        <StatCard label="Work date" value={formatDate(request.workDate)} />
        <StatCard label="Hours" value={`${request.hours} hours`} />
        <StatCard label="Rate" value={`${request.rateType}x`} />
      </div>

      <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Details</h2>
        <p className="text-sm text-[var(--foreground-primary)]">
          {request.reason?.trim() || "No reason provided."}
        </p>
      </section>

      {timeline.length > 0 && (
        <ApprovalTimeline steps={timeline} />
      )}
    </div>
  );
}
