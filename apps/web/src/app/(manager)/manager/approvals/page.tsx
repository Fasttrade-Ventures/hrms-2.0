import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listManagerApprovals } from "@/lib/manager/approvals";
import { requireRole } from "@/lib/auth/session";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  await requireRole("manager");
  const params = await searchParams;
  const rows = await listManagerApprovals().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Review and action pending team requests."
        title="Approvals inbox"
      />

      {params.approved ? (
        <p className="text-sm text-[var(--success)]">Request approved successfully.</p>
      ) : null}
      {params.rejected ? (
        <p className="text-sm text-[var(--danger)]">Request rejected.</p>
      ) : null}

      <ListCard
        columns={[
          { key: "request", label: "Request" },
          { key: "summary", label: "Summary" },
          { key: "status", label: "Status", className: "w-28" },
        ]}
        empty={<EmptyState description="New requests from your team will appear here." title="Inbox empty" />}
        header={<p className="text-sm font-medium">Pending ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.stepId,
          cells: {
            request: (
              <Link className="font-medium text-[var(--accent-primary)]" href={`/manager/approvals/${row.stepId}`}>
                {row.requestTypeLabel} · {row.requesterName}
              </Link>
            ),
            summary: (
              <div>
                <p className="truncate text-sm">{row.summary}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{row.requesterEmployeeNumber}</p>
              </div>
            ),
            status: <StatusPill label="Pending" tone="pending" />,
          },
        }))}
      />
    </div>
  );
}
