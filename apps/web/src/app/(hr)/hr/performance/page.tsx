import Link from "next/link";
import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { PerformanceCycleActions } from "@/components/hr/performance/performance-cycle-actions";
import { CreateCycleForm } from "@/components/hr/performance/create-cycle-form";
import { TemplatesList } from "@/components/hr/performance/templates-list";
import { listReviewCycles } from "@/lib/hr/performance";
import {
  listAppraisalTemplates,
  getAppraisalTemplateDetail,
  type AppraisalTemplateDetail,
} from "@/lib/hr/performance-templates";
import { listDepartments } from "@/lib/hr/organization";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function PerformancePage({ searchParams }: Props) {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const { tab = "cycles" } = await searchParams;

  let loadError: string | null = null;
  let cycles: Awaited<ReturnType<typeof listReviewCycles>> = [];
  let templates: Awaited<ReturnType<typeof listAppraisalTemplates>> = [];
  let departments: Awaited<ReturnType<typeof listDepartments>> = [];

  try {
    const results = await Promise.all([
      listReviewCycles(),
      listAppraisalTemplates(),
      listDepartments(),
    ]);
    cycles = results[0];
    templates = results[1];
    departments = results[2];
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load performance data from database.";
  }

  // Load details map for previews
  const templateDetailsMap: Record<string, AppraisalTemplateDetail> = {};
  for (const t of templates) {
    const detail = await getAppraisalTemplateDetail(t.id).catch(() => null);
    if (detail) {
      templateDetailsMap[t.id] = detail;
    }
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Manage appraisal review cycles, custom template criteria, and employee evaluations."
        title="Performance Management"
      />

      {loadError ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-600 dark:text-red-400">
          <strong>Database Error:</strong> {loadError}
        </div>
      ) : null}

      {/* Tab Navigation */}
      <div className="flex border-b border-[var(--border-primary)]">
        <Link
          href="/hr/performance?tab=cycles"
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "cycles"
              ? "border-[var(--accent-primary)] text-[var(--foreground-primary)]"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
          }`}
        >
          Review Cycles ({cycles.length})
        </Link>
        <Link
          href="/hr/performance?tab=templates"
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "templates"
              ? "border-[var(--accent-primary)] text-[var(--foreground-primary)]"
              : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
          }`}
        >
          Appraisal Templates ({templates.length})
        </Link>
      </div>

      {tab === "templates" ? (
        <TemplatesList templates={templates} templateDetailsMap={templateDetailsMap} />
      ) : (
        <div className="space-y-6">
          <CreateCycleForm
            templates={templates}
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
          />

          <ListCard
            columns={[
              { key: "name", label: "Cycle & Template" },
              { key: "scope", label: "Scope", className: "w-36" },
              { key: "period", label: "Period", className: "w-52" },
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
                      Template: {cycle.templateName ?? "Standard Template"} · Due {formatDate(cycle.dueDate)}
                      {cycle.closedAt ? " · Closed" : ""}
                    </p>
                  </div>
                ),
                scope: (
                  <span className="text-xs text-[var(--foreground-secondary)]">
                    {cycle.targetDepartmentName ?? "All Departments"}
                  </span>
                ),
                period: (
                  <span className="text-sm text-[var(--foreground-secondary)]">
                    {formatDate(cycle.periodStart)} to {formatDate(cycle.periodEnd)}
                  </span>
                ),
                appraisals: (
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cycle.appraisalCount}</span>
                    {cycle.pendingCount > 0 ? (
                      <StatusPill label={`${cycle.pendingCount} pending`} tone="pending" />
                    ) : null}
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
      )}
    </div>
  );
}
