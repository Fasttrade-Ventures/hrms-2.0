"use client";

import { useActionState } from "react";

import {
  subscribeToReportAction,
  type ReportActionState,
} from "@/app/(hr)/hr/reports/subscription-actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

const initialState: ReportActionState = {};

export function ReportSubscriptionPanel({
  slug,
  filters,
  enabled,
}: {
  slug: ReportSlug;
  filters: ReportFilters;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(subscribeToReportAction, initialState);

  if (!enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Scheduled reports are available on the Professional plan or higher.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-lg border border-[var(--border-primary)] p-4">
      <input name="slug" type="hidden" value={slug} />
      <input name="filters" type="hidden" value={JSON.stringify(filters)} />
      <div className="space-y-1">
        <Label htmlFor="schedule">Email schedule</Label>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="weekly"
          id="schedule"
          name="schedule"
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <Button disabled={pending} size="sm" type="submit">
        {pending ? "Saving…" : "Subscribe to this report"}
      </Button>
      {state.error ? <p className="w-full text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="w-full text-sm text-emerald-600">{state.success}</p> : null}
    </form>
  );
}
