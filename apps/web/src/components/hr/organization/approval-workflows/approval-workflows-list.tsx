"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog, EmptyState } from "@hrms/ui";
import { cn } from "@/lib/utils";
import type { ApprovalWorkflowRow } from "@/lib/hr/approval-workflows";
import {
  deleteApprovalWorkflowAction,
  toggleApprovalWorkflowAction,
} from "@/app/(hr)/hr/organization/approval-workflows/actions";

const REQUEST_TYPE_LABELS: Record<string, string> = {
  leave: "Leave Request",
  overtime: "Overtime Request",
  claim: "Expense Claim",
  shift_swap: "Shift Swap",
  attendance_regularization: "Attendance Regularization",
};

const APPROVER_TYPE_LABELS: Record<string, string> = {
  manager: "Line Manager",
  department_head: "Department Head",
  specific_employee: "Specific Employee",
  hr_admin: "HR Administrator",
};

export function ApprovalWorkflowsList({ workflows }: { workflows: ApprovalWorkflowRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeCount = workflows.filter((w) => w.isActive).length;
  const multiStageCount = workflows.filter((w) => w.stepsCount > 1).length;

  const handleDelete = (workflowId: string) => {
    startTransition(async () => {
      await deleteApprovalWorkflowAction(workflowId);
      setDeletingId(null);
    });
  };

  const handleToggleActive = (workflowId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleApprovalWorkflowAction(workflowId, !currentActive);
    });
  };

  return (
    <div className="space-y-6 w-full">
      <PortalPageHeader
        actions={
          <div className="flex items-center gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/approval-workflows/create">
              Create workflow
            </HrLinkButton>
          </div>
        }
        description="Configure multi-stage sequential approval chains, step deadlines, and escalation routes for employee requests."
        title="Approval Workflows"
      />

      <HrStatCards
        columns={3}
        items={[
          { label: "Total Workflows", value: workflows.length, hint: "configured across types" },
          { label: "Active Workflows", value: activeCount, hint: "actively routing requests" },
          { label: "Multi-Stage Chains", value: multiStageCount, hint: "2 or more approval stages" },
        ]}
      />

      {workflows.length === 0 ? (
        <Card className="border-[var(--border-primary)] bg-[var(--surface-card)]">
          <CardContent className="py-12">
            <EmptyState
              action={
                <HrLinkButton href="/hr/organization/approval-workflows/create">
                  Create First Workflow
                </HrLinkButton>
              }
              description="No custom approval workflows configured yet. Standard 1-stage line manager approval applies by default."
              title="No approval workflows"
            />
          </CardContent>
        </Card>
      ) : (
        <HrTableCard>
          {/* Table Header (Desktop) */}
          <div className="hidden border-b border-[var(--border-primary)] bg-muted/50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_10rem] lg:items-center lg:gap-x-4">
            <span>Workflow Name</span>
            <span>Request Type</span>
            <span>Approval Stages & Flow</span>
            <span>Max SLA</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[var(--border-primary)]">
            {workflows.map((wf) => {
              const typeLabel = REQUEST_TYPE_LABELS[wf.requestType] || wf.requestType;
              const totalSla = wf.steps.reduce((sum, s) => sum + (Number(s.timeoutDays) || 0), 0);

              return (
                <div
                  key={wf.id}
                  className="px-4 py-3.5 transition-colors hover:bg-muted/20 lg:grid lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1.2fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_10rem] lg:items-center lg:gap-x-4 space-y-3 lg:space-y-0"
                >
                  {/* Column 1: Name & ID */}
                  <div className="min-w-0">
                    <Link
                      href={`/hr/organization/approval-workflows/${wf.id}/edit`}
                      className="font-semibold text-sm text-[var(--foreground-primary)] hover:underline block truncate"
                    >
                      {wf.name}
                    </Link>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {wf.stepsCount} stage{wf.stepsCount === 1 ? "" : "s"} configured
                    </p>
                  </div>

                  {/* Column 2: Request Type */}
                  <div className="flex items-center">
                    <Badge variant="outline" className="text-xs font-medium">
                      {typeLabel}
                    </Badge>
                  </div>

                  {/* Column 3: Stages Sequence Chips */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {wf.steps.map((step, idx) => {
                        const approverLabel =
                          step.approverType === "specific_employee" && step.specificEmployeeName
                            ? step.specificEmployeeName
                            : APPROVER_TYPE_LABELS[step.approverType] || step.approverType;

                        return (
                          <div key={step.id || idx} className="flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border-primary)] bg-[var(--surface-subtle)] px-2 py-0.5 text-xs text-[var(--foreground-secondary)]">
                              <span className="font-semibold text-[var(--accent-primary)]">
                                {step.stepOrder}.
                              </span>
                              <span className="font-medium text-[var(--foreground-primary)] truncate max-w-[120px]">
                                {step.stepLabel}
                              </span>
                              <span className="text-[var(--foreground-muted)]">({approverLabel})</span>
                            </span>
                            {idx < wf.steps.length - 1 && (
                              <span className="text-xs text-[var(--foreground-muted)]">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Column 4: Turnaround SLA */}
                  <div className="text-xs font-medium text-[var(--foreground-secondary)]">
                    {totalSla} days total
                  </div>

                  {/* Column 5: Status */}
                  <div className="flex items-center">
                    <Badge
                      variant={wf.isActive ? "outline" : "secondary"}
                      className={cn(
                        wf.isActive
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : "border-rose-500/30 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
                      )}
                    >
                      {wf.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  {/* Column 6: Actions */}
                  <div className="flex items-center justify-start lg:justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleToggleActive(wf.id, wf.isActive)}
                      className="h-8 px-2 text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground-primary)]"
                    >
                      {wf.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <HrLinkButton
                      href={`/hr/organization/approval-workflows/${wf.id}/edit`}
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs"
                    >
                      Edit
                    </HrLinkButton>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setDeletingId(wf.id)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </HrTableCard>
      )}

      {deletingId && (
        <ConfirmDialog
          open={true}
          title="Delete Approval Workflow"
          message="Are you sure you want to delete this approval workflow? In-flight requests will finish using their assigned steps, but new requests will fall back to default line manager approval."
          confirmLabel="Delete"
          tone="danger"
          isPending={isPending}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
