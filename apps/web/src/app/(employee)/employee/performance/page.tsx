import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listMyAppraisals } from "@/lib/employee/performance";
import { requireModule } from "@/lib/entitlements";
import { appraisalStatusLabel, appraisalStatusTone } from "@/lib/performance/types";

export default async function Page() {
  await requireModule("performance");
  const rows = await listMyAppraisals().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Performance reviews and goals." title="Performance" />

      <ListCard
        columns={[
          { key: "cycle", label: "Review cycle" },
          { key: "due", label: "Due", className: "w-32" },
          { key: "ratings", label: "Ratings", className: "w-40" },
          { key: "status", label: "Status", className: "w-36" },
          { key: "action", label: "", className: "w-24" },
        ]}
        empty={
          <EmptyState
            description="Appraisal cycles will appear here when HR publishes a review period."
            title="No performance reviews"
          />
        }
        header={<p className="text-sm font-medium">My appraisals ({rows.length})</p>}
        rows={rows.map((row) => ({
          id: row.id,
          cells: {
            cycle: row.cycleName,
            due: row.dueDate,
            ratings: [
              row.selfRating != null ? `Self ${row.selfRating}/5` : null,
              row.managerRating != null ? `Manager ${row.managerRating}/5` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—",
            status: (
              <StatusPill label={appraisalStatusLabel(row.status)} tone={appraisalStatusTone(row.status)} />
            ),
            action: (
              <Link
                className="text-sm font-medium text-[var(--accent-primary)]"
                href={`/employee/performance/${row.id}`}
              >
                {row.status === "draft" && !row.cycleClosed ? "Start" : "View"}
              </Link>
            ),
          },
        }))}
      />
    </div>
  );
}
