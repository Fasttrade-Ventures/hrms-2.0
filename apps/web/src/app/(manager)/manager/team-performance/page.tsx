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
          { key: "employee", label: "Employee", className: "min-w-0 flex-1" },
          { key: "cycle", label: "Cycle", className: "hidden sm:block min-w-0 flex-1" },
          { key: "status", label: "Status", className: "w-32 sm:w-36 text-right sm:text-left" },
          { key: "action", label: "", className: "w-20 text-right" },
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
            employee: (
              <div className="space-y-1">
                <div className="font-semibold text-[var(--foreground-primary)]">{row.employeeName}</div>
                <div className="block sm:hidden text-xs text-[var(--foreground-muted)] leading-normal">
                  {[
                    row.cycleName,
                    row.selfRating != null ? `Self ${row.selfRating}/5` : null,
                    row.managerRating != null ? `Manager ${row.managerRating}/5` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            ),
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
                className="text-sm font-medium text-[var(--accent-primary)] hover:underline"
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
