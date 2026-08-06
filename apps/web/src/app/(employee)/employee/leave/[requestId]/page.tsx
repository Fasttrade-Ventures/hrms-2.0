import Link from "next/link";
import { notFound } from "next/navigation";

import { StatCard } from "@hrms/ui";

import {
  formatDate,
  formatDateTime,
  RequestStatusPill,
} from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getLeaveRequest } from "@/lib/employee/leave";

export default async function LeaveDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { requestId } = await params;
  const query = await searchParams;
  const request = await getLeaveRequest(requestId);

  if (!request) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/employee/leave"
          >
            Back to leave
          </Link>
        }
        description={`Submitted ${formatDateTime(request.createdAt)}`}
        title={request.leaveTypeName}
      />

      {query.submitted === "1" ? (
        <div className="border border-[var(--accent-primary)] bg-[var(--surface-accent-soft)] px-4 py-3 text-sm text-[var(--accent-primary)]">
          Leave request submitted and pending manager approval.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
          <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Status</p>
          <div className="mt-2">
            <RequestStatusPill status={request.status} />
          </div>
        </div>
        <StatCard label="Days" value={request.days} />
        <StatCard label="Start" value={formatDate(request.startDate)} />
        <StatCard label="End" value={formatDate(request.endDate)} />
      </div>

      <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
        <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Details</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          {request.halfDay ? "Includes a half-day on the last date." : "Full-day leave."}
        </p>
        <p className="text-sm text-[var(--foreground-primary)]">
          {request.reason?.trim() || "No reason provided."}
        </p>
      </section>

      {request.attachmentFileId && (
        <section className="space-y-3 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6">
          <h2 className="text-base font-semibold text-[var(--foreground-primary)]">Supporting document</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/api/files/${request.attachmentFileId}/download`}
              target="_blank"
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] hover:underline"
            >
              📎 {request.attachmentFileName ?? "Download document"}
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
