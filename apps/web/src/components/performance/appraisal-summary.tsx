import { StatusPill } from "@hrms/ui";

import { PortalSectionCard } from "@/components/portal/portal-section";
import { appraisalStatusLabel, appraisalStatusTone } from "@/lib/performance/types";
import type { AppraisalDetail } from "@/lib/performance/types";

export function AppraisalSummary({ appraisal }: { appraisal: AppraisalDetail }) {
  const tiles = [
    {
      label: "Status",
      value: (
        <StatusPill
          label={appraisalStatusLabel(appraisal.status)}
          tone={appraisalStatusTone(appraisal.status)}
        />
      ),
    },
    {
      label: "Review period",
      value: (
        <span className="font-medium text-[var(--foreground-primary)]">
          {appraisal.periodStart} → {appraisal.periodEnd}
        </span>
      ),
    },
    {
      label: "Due date",
      value: (
        <span className="font-medium text-[var(--foreground-primary)]">{appraisal.dueDate}</span>
      ),
    },
    {
      label: "Cycle",
      value: (
        <span className="font-medium text-[var(--foreground-primary)]">
          {appraisal.cycleName}
          {appraisal.cycleClosed ? " (closed)" : ""}
        </span>
      ),
    },
  ];

  return (
    <PortalSectionCard description="Cycle timing and current appraisal status." title="Appraisal summary">
      <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <div
            className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5"
            key={tile.label}
          >
            <dt className="text-xs text-[var(--foreground-muted)]">{tile.label}</dt>
            <dd className="mt-1">{tile.value}</dd>
          </div>
        ))}
      </dl>
    </PortalSectionCard>
  );
}
