"use client";

import { useActionState, useState } from "react";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  saveApprovalWorkflowAction,
  type ApprovalWorkflowActionState,
} from "@/app/(hr)/hr/organization/approval-workflows/actions";
import type {
  ApprovalWorkflowRow,
  ApprovalWorkflowStepData,
  CandidateOption,
} from "@/lib/hr/approval-workflows";
import type { ApproverType, EscalationAction } from "@/lib/approvals/types";
import { cn } from "@/lib/utils";

const REQUEST_TYPE_OPTIONS = [
  { value: "leave", label: "Leave Request" },
  { value: "overtime", label: "Overtime Request" },
  { value: "claim", label: "Expense Claim" },
  { value: "shift_swap", label: "Shift Swap" },
];

const APPROVER_TYPE_OPTIONS: Array<{ value: ApproverType; label: string; desc: string }> = [
  { value: "manager", label: "Line Manager", desc: "Requester's direct reporting manager" },
  { value: "department_head", label: "Department Head", desc: "Head of the requester's department" },
  { value: "specific_employee", label: "Specific Employee", desc: "Designated staff member" },
  { value: "hr_admin", label: "HR Administrator", desc: "Any user with HR Administrator role" },
];

const ESCALATION_ACTION_OPTIONS: Array<{ value: EscalationAction; label: string }> = [
  { value: "none", label: "None (Do not reassign)" },
  { value: "escalate_to_manager_of_manager", label: "Escalate to Manager's Manager" },
  { value: "escalate_to_hr", label: "Escalate to HR Administrators" },
  { value: "escalate_to_employee", label: "Escalate to Specific Contact" },
];

const initialState: ApprovalWorkflowActionState = {};

export function ApprovalWorkflowEditor({
  workflow,
  candidates,
}: {
  workflow?: ApprovalWorkflowRow | null;
  candidates: CandidateOption[];
}) {
  const [state, formAction, isPending] = useActionState(saveApprovalWorkflowAction, initialState);

  const [workflowName, setWorkflowName] = useState<string>(
    workflow?.name ?? "Standard Leave Approval",
  );
  const [requestType, setRequestType] = useState<string>(workflow?.requestType ?? "leave");
  const [isActive, setIsActive] = useState<boolean>(workflow ? workflow.isActive : true);

  const [stages, setStages] = useState<ApprovalWorkflowStepData[]>(
    workflow?.steps?.length
      ? workflow.steps
      : [
          {
            stepOrder: 1,
            stepLabel: "Line Manager Review",
            approverType: "manager",
            timeoutDays: 2,
            escalationAction: "escalate_to_manager_of_manager",
          },
          {
            stepOrder: 2,
            stepLabel: "Department Head Approval",
            approverType: "department_head",
            timeoutDays: 3,
            escalationAction: "escalate_to_hr",
          },
        ],
  );

  const addStage = () => {
    const nextOrder = stages.length + 1;
    setStages([
      ...stages,
      {
        stepOrder: nextOrder,
        stepLabel: `Stage ${nextOrder}`,
        approverType: "hr_admin",
        timeoutDays: 3,
        escalationAction: "none",
      },
    ]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    const updated = stages
      .filter((_, idx) => idx !== index)
      .map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    setStages(updated);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const current = newStages[index];
    const target = newStages[targetIndex];
    if (!current || !target) return;

    newStages[index] = target;
    newStages[targetIndex] = current;

    const reordered = newStages.map((s, idx) => ({ ...s, stepOrder: idx + 1 }));
    setStages(reordered);
  };

  const updateStage = (index: number, updates: Partial<ApprovalWorkflowStepData>) => {
    setStages(
      stages.map((s, idx) => {
        if (idx !== index) return s;
        return { ...s, ...updates };
      }),
    );
  };

  const totalSlaDays = stages.reduce((sum, s) => sum + (Number(s.timeoutDays) || 0), 0);
  const selectedTypeLabel =
    REQUEST_TYPE_OPTIONS.find((r) => r.value === requestType)?.label || requestType;

  return (
    <div className="space-y-6 w-full">
      <PortalPageHeader
        actions={
          <div className="flex items-center gap-2">
            <HrLinkButton href="/hr/organization/approval-workflows" variant="outline">
              Back to list
            </HrLinkButton>
          </div>
        }
        description={
          workflow
            ? `Editing multi-stage workflow: ${workflow.name}`
            : "Define sequential approval stages, approver roles, response deadlines, and escalation routing."
        }
        title={workflow ? "Edit Approval Workflow" : "Create Approval Workflow"}
      />

      <form action={formAction} className="space-y-6">
        {workflow?.id && <input type="hidden" name="workflowId" value={workflow.id} />}
        <input type="hidden" name="stepsJson" value={JSON.stringify(stages)} />

        {state.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm font-medium text-destructive">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Main Left Form Area (8 cols) */}
          <div className="space-y-6 lg:col-span-8">
            <Card className="border-[var(--border-primary)] bg-[var(--surface-card)]">
              <CardHeader className="border-b border-[var(--border-primary)] pb-3">
                <CardTitle className="text-base font-semibold">General Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                      Workflow Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      value={workflowName}
                      onChange={(e) => setWorkflowName(e.target.value)}
                      placeholder="e.g. Standard Multi-Stage Leave Approval"
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requestType" className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                      Request Type
                    </Label>
                    <select
                      id="requestType"
                      name="requestType"
                      required
                      disabled={Boolean(workflow?.id)}
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-input)] px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {REQUEST_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {workflow?.id && <input type="hidden" name="requestType" value={workflow.requestType} />}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-primary)]">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-primary)] text-primary focus:ring-primary"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer text-sm font-medium">
                    Active (Enable this workflow for incoming requests)
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Stages Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--foreground-primary)]">
                    Sequential Approval Stages ({stages.length})
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Requests execute sequentially from Stage 1 to Stage {stages.length}.
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addStage} className="h-9">
                  + Add Stage
                </Button>
              </div>

              <div className="space-y-4">
                {stages.map((stage, idx) => (
                  <Card
                    key={idx}
                    className="border-[var(--border-primary)] bg-[var(--surface-card)] transition-all shadow-sm"
                  >
                    <CardHeader className="border-b border-[var(--border-primary)] pb-3 pt-4 bg-[var(--surface-subtle)]/40">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-bold text-white shadow-xs">
                            {stage.stepOrder}
                          </span>
                          <span className="font-semibold text-sm text-[var(--foreground-primary)]">
                            Stage {stage.stepOrder}: {stage.stepLabel || "Untitled"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => moveStage(idx, "up")}
                            className="h-7 px-2 text-xs"
                          >
                            ↑ Move Up
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={idx === stages.length - 1}
                            onClick={() => moveStage(idx, "down")}
                            className="h-7 px-2 text-xs"
                          >
                            ↓ Move Down
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={stages.length <= 1}
                            onClick={() => removeStage(idx)}
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="grid gap-4 md:grid-cols-2 pt-4 pb-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                          Stage Label / Title
                        </Label>
                        <Input
                          value={stage.stepLabel}
                          onChange={(e) => updateStage(idx, { stepLabel: e.target.value })}
                          placeholder="e.g. Line Manager Review"
                          className="h-9 text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                          Approver Role / Type
                        </Label>
                        <select
                          value={stage.approverType}
                          onChange={(e) =>
                            updateStage(idx, {
                              approverType: e.target.value as ApproverType,
                              specificEmployeeId: null,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-input)] px-2.5 text-xs shadow-sm"
                        >
                          {APPROVER_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label} ({opt.desc})
                            </option>
                          ))}
                        </select>
                      </div>

                      {stage.approverType === "specific_employee" && (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                            Select Designated Employee
                          </Label>
                          <select
                            value={stage.specificEmployeeId || ""}
                            onChange={(e) => updateStage(idx, { specificEmployeeId: e.target.value })}
                            required
                            className="flex h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-input)] px-2.5 text-xs shadow-sm"
                          >
                            <option value="">-- Choose employee --</option>
                            {candidates.map((cand) => (
                              <option key={cand.id} value={cand.id}>
                                {cand.fullName} {cand.jobTitle ? `(${cand.jobTitle})` : ""}{" "}
                                {cand.departmentName ? `· ${cand.departmentName}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                          Timeout Deadline (Days)
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          value={stage.timeoutDays}
                          onChange={(e) => updateStage(idx, { timeoutDays: Number(e.target.value) || 1 })}
                          className="h-9 text-sm"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                          Auto-Escalation on Timeout
                        </Label>
                        <select
                          value={stage.escalationAction}
                          onChange={(e) =>
                            updateStage(idx, {
                              escalationAction: e.target.value as EscalationAction,
                              escalationEmployeeId: null,
                            })
                          }
                          className="flex h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-input)] px-2.5 text-xs shadow-sm"
                        >
                          {ESCALATION_ACTION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {stage.escalationAction === "escalate_to_employee" && (
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs font-medium text-[var(--foreground-secondary)]">
                            Select Escalation Contact
                          </Label>
                          <select
                            value={stage.escalationEmployeeId || ""}
                            onChange={(e) => updateStage(idx, { escalationEmployeeId: e.target.value })}
                            required
                            className="flex h-9 w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-input)] px-2.5 text-xs shadow-sm"
                          >
                            <option value="">-- Choose escalation contact --</option>
                            {candidates.map((cand) => (
                              <option key={cand.id} value={cand.id}>
                                {cand.fullName} {cand.jobTitle ? `(${cand.jobTitle})` : ""}{" "}
                                {cand.departmentName ? `· ${cand.departmentName}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Live Summary, Sequence Visualizer & Action Panel (4 cols) */}
          <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-6">
            <Card className="border-[var(--border-primary)] bg-[var(--surface-card)] shadow-sm">
              <CardHeader className="border-b border-[var(--border-primary)] pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Workflow Preview</CardTitle>
                  <Badge
                    variant={isActive ? "outline" : "secondary"}
                    className={cn(
                      isActive
                        ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "border-rose-500/30 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
                    )}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Target Request Type
                  </p>
                  <p className="text-sm font-medium text-[var(--foreground-primary)] mt-0.5">
                    {selectedTypeLabel}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Max Response SLA
                  </p>
                  <p className="text-sm font-medium text-[var(--foreground-primary)] mt-0.5">
                    {totalSlaDays} days total across {stages.length} stage{stages.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-primary)]">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Approval Progression
                  </p>

                  <div className="space-y-2.5">
                    {stages.map((stage, idx) => {
                      const approverText =
                        APPROVER_TYPE_OPTIONS.find((a) => a.value === stage.approverType)?.label ||
                        stage.approverType;

                      return (
                        <div key={idx} className="relative flex items-start gap-2.5">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)]/10 text-xs font-bold text-[var(--accent-primary)] mt-0.5">
                            {stage.stepOrder}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--foreground-primary)] truncate">
                              {stage.stepLabel || `Stage ${stage.stepOrder}`}
                            </p>
                            <p className="text-[11px] text-[var(--foreground-secondary)]">
                              {approverText} · {stage.timeoutDays}d timeout
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    <div className="relative flex items-start gap-2.5 pt-1">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 mt-0.5 dark:bg-emerald-950 dark:text-emerald-300">
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Final Approval
                        </p>
                        <p className="text-[11px] text-[var(--foreground-muted)]">
                          Request finalized & balances updated
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-primary)] space-y-2">
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending ? "Saving..." : workflow ? "Save Changes" : "Create Workflow"}
                  </Button>
                  <HrLinkButton
                    href="/hr/organization/approval-workflows"
                    variant="outline"
                    className="w-full text-center"
                  >
                    Cancel
                  </HrLinkButton>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[var(--border-primary)] bg-[var(--surface-subtle)]/40 p-4 text-xs text-[var(--foreground-secondary)] space-y-2">
              <p className="font-semibold text-[var(--foreground-primary)]">Routing Rules:</p>
              <ul className="space-y-1 list-disc list-inside text-[var(--foreground-muted)]">
                <li><strong className="text-[var(--foreground-secondary)]">Line Manager:</strong> Resolves from the employee&apos;s direct reporting manager.</li>
                <li><strong className="text-[var(--foreground-secondary)]">Department Head:</strong> Resolves from the department head assigned under Organization Departments.</li>
                <li><strong className="text-[var(--foreground-secondary)]">Escalations:</strong> Automatically triggered by cron when a step exceeds its timeout days.</li>
              </ul>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
