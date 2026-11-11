"use client";

import { useActionState, useState } from "react";

import {
  setRequisitionStatusAction,
  updateRequisitionAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import {
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
} from "@/components/hr/employees/form-fields";
import {
  OrgSelectOption,
  RequisitionFormFields,
} from "@/components/hr/recruitment/requisition-form-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatEmploymentType } from "@/lib/employees/display-labels";
import type { RequisitionDetail } from "@/lib/recruitment/requisitions";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";

const actionInitialState: RecruitmentActionState = {};
const DESCRIPTION_TOGGLE_THRESHOLD = 90;

function requisitionStatusBadge(status: RequisitionStatus) {
  if (status === "open") return <Badge variant="success">Open</Badge>;
  if (status === "on_hold") return <Badge variant="warning">On hold</Badge>;
  return <Badge variant="outline">Closed</Badge>;
}

function formatStripMeta(detail: RequisitionDetail): string {
  return [
    formatEmploymentType(detail.employmentType),
    detail.departmentName ?? "No department",
    detail.branchName ?? "No branch",
    `${detail.hiredCount}/${detail.headcount} hired`,
    `${detail.openPipelineCount} in pipeline`,
  ].join(" · ");
}

function StatusForm({
  requisitionId,
  status,
  label,
  variant = "outline",
}: {
  requisitionId: string;
  status: RequisitionStatus;
  label: string;
  variant?: "outline" | "destructive";
}) {
  const [state, action, pending] = useActionState(setRequisitionStatusAction, actionInitialState);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={action} className="inline">
        <input name="requisitionId" type="hidden" value={requisitionId} />
        <input name="status" type="hidden" value={status} />
        <Button disabled={pending} size="sm" type="submit" variant={variant}>
          {pending ? "Updating…" : label}
        </Button>
      </form>
      <HrFormMessage error={state.error} success={state.success} />
    </div>
  );
}

function StatusActions({ detail }: { detail: RequisitionDetail }) {
  const form = (
    status: RequisitionStatus,
    label: string,
    variant: "outline" | "destructive" = "outline",
  ) => (
    <StatusForm
      key={`${detail.id}-${status}`}
      label={label}
      requisitionId={detail.id}
      status={status}
      variant={variant}
    />
  );

  if (detail.status === "open") {
    return (
      <>
        {form("on_hold", "Hold")}
        {form("closed", "Close")}
      </>
    );
  }
  if (detail.status === "on_hold") {
    return (
      <>
        {form("open", "Resume")}
        {form("closed", "Close")}
      </>
    );
  }
  return <>{form("open", "Re-open")}</>;
}

function EditDialog({
  detail,
  open,
  onOpenChange,
  branches,
  departments,
}: {
  detail: RequisitionDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
}) {
  const [state, action, pending] = useActionState(updateRequisitionAction, actionInitialState);
  const readOnly = detail.status === "closed";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{readOnly ? "View requisition" : "Edit requisition"}</DialogTitle>
          <DialogDescription>
            {readOnly
              ? "Closed requisitions are read-only. Re-open to resume hiring."
              : "Update job details while the requisition is open or on hold."}
          </DialogDescription>
        </DialogHeader>
        {readOnly ? (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{detail.title}</p>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {detail.description?.trim() ? detail.description : "No description."}
            </p>
            <p className="text-muted-foreground">{formatStripMeta(detail)}</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input name="requisitionId" type="hidden" value={detail.id} />
            <RequisitionFormFields
              branches={branches}
              defaults={{
                title: detail.title,
                description: detail.description,
                headcount: detail.headcount,
                employmentType: detail.employmentType,
                departmentId: detail.departmentId,
                branchId: detail.branchId,
              }}
              departments={departments}
              idPrefix={`strip-edit-${detail.id}-`}
            />
            <HrFormMessage error={state.error} success={state.success} />
            <DialogFooter className="gap-2 sm:gap-0">
              <HrGhostButton onClick={() => onOpenChange(false)} type="button">
                Cancel
              </HrGhostButton>
              <HrPrimaryButton disabled={pending} type="submit">
                {pending ? "Saving…" : "Save changes"}
              </HrPrimaryButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RequisitionCommandStrip({
  detail,
  branches,
  departments,
  onAddCandidate,
  addDisabled,
}: {
  detail: RequisitionDetail;
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
  /** Opens the add-candidate Sheet (owned by `RequisitionDesk`). */
  onAddCandidate: () => void;
  addDisabled: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const description = detail.description?.trim() ?? "";
  const longDescription = description.length > DESCRIPTION_TOGGLE_THRESHOLD || description.includes("\n");
  const muted = detail.status !== "open";

  return (
    <section
      aria-label="Requisition summary"
      className={cn(
        "rounded-xl border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 py-3 shadow-sm lg:sticky lg:top-0 lg:z-20",
        // Opaque tone cue: solid page surface + dashed border (no see-through fill).
        muted && "border-dashed bg-[var(--surface-primary)]",
      )}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-semibold text-foreground">{detail.title}</h1>
            {requisitionStatusBadge(detail.status)}
          </div>
          <p className="text-sm text-muted-foreground">{formatStripMeta(detail)}</p>
          {description ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <p className={cn("min-w-0 flex-1 whitespace-pre-wrap", !expanded && "line-clamp-1")}>
                {description}
              </p>
              {longDescription ? (
                <button
                  className="shrink-0 font-medium text-primary hover:underline"
                  onClick={() => setExpanded((value) => !value)}
                  type="button"
                >
                  {expanded ? "Less" : "More"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-2 lg:justify-end">
          {!addDisabled ? (
            <Button
              onClick={onAddCandidate}
              size="sm"
              type="button"
            >
              Add candidate
            </Button>
          ) : null}
          <Button onClick={() => setEditOpen(true)} size="sm" type="button" variant="outline">
            {detail.status === "closed" ? "View" : "Edit"}
          </Button>
          <StatusActions detail={detail} />
        </div>
      </div>

      {editOpen ? (
        <EditDialog
          branches={branches}
          departments={departments}
          detail={detail}
          onOpenChange={setEditOpen}
          open={editOpen}
        />
      ) : null}
    </section>
  );
}
