"use client";

import { useTransition } from "react";

import { closeReviewCycleAction, launchAppraisalsAction } from "@/app/(hr)/hr/performance/actions";
import { Button } from "@/components/ui/button";

export function PerformanceCycleActions({
  cycleId,
  closed,
  appraisalCount,
}: {
  cycleId: string;
  closed: boolean;
  appraisalCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!closed ? (
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void launchAppraisalsAction(cycleId);
            })
          }
          size="sm"
          type="button"
          variant="outline"
        >
          {pending ? "Working…" : "Launch appraisals"}
        </Button>
      ) : null}
      {!closed ? (
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void closeReviewCycleAction(cycleId);
            })
          }
          size="sm"
          type="button"
          variant="secondary"
        >
          Close cycle
        </Button>
      ) : (
        <span className="text-xs font-medium text-[var(--foreground-muted)]">Closed</span>
      )}
      {appraisalCount > 0 ? (
        <a
          className="inline-flex h-8 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--surface-muted)]"
          href={`/api/hr/performance/export?cycleId=${cycleId}`}
        >
          Export CSV
        </a>
      ) : null}
    </div>
  );
}
