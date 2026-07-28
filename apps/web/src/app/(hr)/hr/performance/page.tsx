import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createReviewCycleFormAction } from "@/app/(hr)/hr/performance/actions";
import { PerformanceCycleActions } from "@/components/hr/performance/performance-cycle-actions";
import { listReviewCycles } from "@/lib/hr/performance";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const cycles = await listReviewCycles().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Define appraisal cycles and launch self/manager reviews for active employees."
        title="Performance"
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>New review cycle</CardTitle>
          <CardDescription>Create a cycle before launching employee appraisals.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createReviewCycleFormAction} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Cycle name</Label>
              <Input id="name" name="name" placeholder="H2 2026 Performance Review" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period start</Label>
              <Input id="periodStart" name="periodStart" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period end</Label>
              <Input id="periodEnd" name="periodEnd" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date</Label>
              <Input id="dueDate" name="dueDate" type="date" required />
            </div>
            <div className="flex items-end">
              <Button type="submit">Create cycle</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <ListCard
        columns={[
          { key: "name", label: "Cycle" },
          { key: "period", label: "Period" },
          { key: "appraisals", label: "Appraisals", className: "w-28" },
          { key: "actions", label: "", className: "w-56" },
        ]}
        empty={
          <EmptyState
            description="Create a review cycle to start the performance module."
            title="No review cycles"
          />
        }
        header={<p className="text-sm font-medium text-[var(--foreground-primary)]">Review cycles</p>}
        rows={cycles.map((cycle) => ({
          id: cycle.id,
          cells: {
            name: (
              <div>
                <p className="font-medium">{cycle.name}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Due {cycle.dueDate}
                  {cycle.closedAt ? " · Closed" : ""}
                </p>
              </div>
            ),
            period: (
              <span className="text-sm text-[var(--foreground-secondary)]">
                {cycle.periodStart} → {cycle.periodEnd}
              </span>
            ),
            appraisals: (
              <div className="flex items-center gap-2">
                <span className="text-sm">{cycle.appraisalCount}</span>
                {cycle.pendingCount > 0 ? <StatusPill label={`${cycle.pendingCount} pending`} tone="pending" /> : null}
              </div>
            ),
            actions: (
              <PerformanceCycleActions
                appraisalCount={cycle.appraisalCount}
                closed={Boolean(cycle.closedAt)}
                cycleId={cycle.id}
              />
            ),
          },
        }))}
      />
    </div>
  );
}
