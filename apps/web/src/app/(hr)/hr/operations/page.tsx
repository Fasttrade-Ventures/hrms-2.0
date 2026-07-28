import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listOrgPendingApprovals } from "@/lib/hr/operations";
import { requireRole } from "@/lib/auth/session";

export default async function HrOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ approved?: string; rejected?: string }>;
}) {
  await requireRole("hr_administrator");
  const params = await searchParams;
  const rows = await listOrgPendingApprovals().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/dashboard" variant="outline">Back to dashboard</HrLinkButton>}
        description="Org-wide pending approvals — action on behalf of managers when needed."
        title="HR operations"
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
        empty={
          <EmptyState
            description="Pending leave, claims, OT, and attendance requests will appear here."
            title="Operations queue is clear"
          />
        }
        header={<p className="text-sm font-medium">Pending ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.stepId,
          cells: {
            request: (
              <Link
                className="font-medium text-[var(--accent-primary)]"
                href={`/hr/operations/${row.stepId}`}
              >
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
