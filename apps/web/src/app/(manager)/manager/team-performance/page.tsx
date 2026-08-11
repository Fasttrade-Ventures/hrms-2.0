import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamPerformance } from "@/lib/manager/performance";
import { requireModule } from "@/lib/entitlements";
import { appraisalStatusLabel, appraisalStatusTone } from "@/lib/performance/types";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  await requireModule("performance");
  const rows = await listTeamPerformance().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Performance appraisals for your direct reports."
        title="Team Performance"
      />

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "cycle", label: "Cycle" },
          { key: "status", label: "Status", className: "w-36" },
          { key: "action", label: "", className: "w-24" },
        ]}
        empty={
          <EmptyState
            description="Appraisal cycles will appear here when HR creates review cycles."
            title="No appraisals"
          />
        }
        header={<p className="text-sm font-medium">Appraisals ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            employee: row.employeeName,
            cycle: [
              row.cycleName,
              row.selfRating != null ? `Self ${row.selfRating}/5` : null,
              row.managerRating != null ? `Manager ${row.managerRating}/5` : null,
            ]
              .filter(Boolean)
              .join(" · "),
            status: (
              <StatusPill label={appraisalStatusLabel(row.status)} tone={appraisalStatusTone(row.status)} />
            ),
            action: (
              <Link
                className="text-sm font-medium text-[var(--accent-primary)]"
                href={`/manager/team-performance/${row.id}`}
              >
                {row.canReview ? "Review" : "View"}
              </Link>
            ),
          },
        }))}
      />
    </div>
  );
}
