import { StatusPill } from "@hrms/ui";

import { appraisalStatusLabel, appraisalStatusTone } from "@/lib/performance/types";
import type { AppraisalDetail } from "@/lib/performance/types";

export function AppraisalSummary({ appraisal }: { appraisal: AppraisalDetail }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Status</p>
        <div className="mt-2">
          <StatusPill label={appraisalStatusLabel(appraisal.status)} tone={appraisalStatusTone(appraisal.status)} />
        </div>
      </div>
      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Review period</p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground-primary)]">
          {appraisal.periodStart} → {appraisal.periodEnd}
        </p>
      </div>
      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Due date</p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground-primary)]">{appraisal.dueDate}</p>
      </div>
      <div className="border border-[var(--border-primary)] bg-[var(--surface-card)] p-5">
        <p className="text-[13px] font-medium text-[var(--foreground-muted)]">Cycle</p>
        <p className="mt-2 text-sm font-medium text-[var(--foreground-primary)]">
          {appraisal.cycleName}
          {appraisal.cycleClosed ? " (closed)" : ""}
        </p>
      </div>
    </div>
  );
}
