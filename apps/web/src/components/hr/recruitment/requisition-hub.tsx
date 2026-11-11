"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { EmptyState } from "@hrms/ui";

import {
  setRequisitionStatusAction,
  updateRequisitionAction,
  type RecruitmentActionState,
} from "@/app/(hr)/hr/recruitment/actions";
import { CreateRequisitionForm } from "@/components/hr/recruitment/create-requisition-form";
import {
  OrgSelectOption,
  RequisitionFormFields,
} from "@/components/hr/recruitment/requisition-form-fields";
import {
  HrField,
  HrFormMessage,
  HrGhostButton,
  HrPrimaryButton,
  HrSelect,
  HrTextInput,
} from "@/components/hr/employees/form-fields";
import { HrTableCard } from "@/components/hr/hr-ui";
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
import { formatEmploymentType } from "@/lib/employees/display-labels";
import type { RequisitionListItem } from "@/lib/recruitment/requisitions";
import type { RequisitionStatus } from "@/lib/recruitment/requisition-status";

const actionInitialState: RecruitmentActionState = {};

function requisitionStatusBadge(status: RequisitionStatus) {
  if (status === "open") return <Badge variant="success">Open</Badge>;
  if (status === "on_hold") return <Badge variant="warning">On hold</Badge>;
  return <Badge variant="outline">Closed</Badge>;
}

function formatMeta(row: RequisitionListItem): string {
  const parts = [
    row.departmentName ?? "No department",
    row.branchName ?? "No branch",
    formatEmploymentType(row.employmentType),
  ];
  return parts.join(" · ");
}

function RequisitionStatusForm({
  row,
  status,
  label,
  variant = "outline",
}: {
  row: RequisitionListItem;
  status: RequisitionStatus;
  label: string;
  variant?: "outline" | "destructive";
}) {
  const [state, action, pending] = useActionState(setRequisitionStatusAction, actionInitialState);

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <form action={action} className="inline">
        <input name="requisitionId" type="hidden" value={row.id} />
        <input name="status" type="hidden" value={status} />
        <Button disabled={pending} size="sm" type="submit" variant={variant}>
          {pending ? "Updating…" : label}
        </Button>
      </form>
      <HrFormMessage error={state.error} success={state.success} />
    </div>
  );
}

function RequisitionStatusActions({ row }: { row: RequisitionListItem }) {
  const statusForm = (
    targetStatus: RequisitionStatus,
    label: string,
    variant: "outline" | "destructive" = "outline",
  ) => (
    <RequisitionStatusForm key={`${row.id}-${targetStatus}`} label={label} row={row} status={targetStatus} variant={variant} />
  );

  if (row.status === "open") {
    return (
      <div className="flex flex-wrap items-end gap-2">
        {statusForm("on_hold", "Hold")}
        {statusForm("closed", "Close")}
      </div>
    );
  }
  if (row.status === "on_hold") {
    return (
      <div className="flex flex-wrap items-end gap-2">
        {statusForm("open", "Resume")}
        {statusForm("closed", "Close")}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2">{statusForm("open", "Re-open")}</div>
  );
}

function EditRequisitionDialog({
  row,
  open,
  onOpenChange,
  branches,
  departments,
}: {
  row: RequisitionListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
}) {
  const [state, action, pending] = useActionState(updateRequisitionAction, actionInitialState);
  const readOnly = row.status === "closed";

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
            <p className="font-medium">{row.title}</p>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {row.description?.trim() ? row.description : "No description."}
            </p>
            <p className="text-muted-foreground">
              Headcount {row.headcount} · {formatMeta(row)}
            </p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input name="requisitionId" type="hidden" value={row.id} />
            <RequisitionFormFields
              branches={branches}
              defaults={{
                title: row.title,
                description: row.description,
                headcount: row.headcount,
                employmentType: row.employmentType,
                departmentId: row.departmentId,
                branchId: row.branchId,
              }}
              departments={departments}
              idPrefix={`edit-${row.id}-`}
            />
            <HrFormMessage error={state.error} success={state.success} />
            <DialogFooter className="gap-2 sm:gap-0">
              <HrGhostButton type="button" onClick={() => onOpenChange(false)}>
                Cancel
              </HrGhostButton>
              <HrPrimaryButton disabled={pending} type="submit">
                {pending ? "Saving…" : "Save changes"}
              </HrPrimaryButton>
            </DialogFooter>
          </form>
        )}
        {readOnly ? (
          <DialogFooter>
            <RequisitionStatusActions row={row} />
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function RequisitionHub({
  requisitions,
  branches,
  departments,
}: {
  requisitions: RequisitionListItem[];
  branches: OrgSelectOption[];
  departments: OrgSelectOption[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [titleSearch, setTitleSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<RequisitionListItem | null>(null);

  const filtered = useMemo(() => {
    const query = titleSearch.trim().toLowerCase();
    return requisitions.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (branchFilter && row.branchId !== branchFilter) return false;
      if (departmentFilter && row.departmentId !== departmentFilter) return false;
      if (query && !row.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [requisitions, statusFilter, branchFilter, departmentFilter, titleSearch]);

  const hasRequisitions = requisitions.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          onClick={() => setShowCreate((value) => !value)}
          type="button"
          variant={showCreate ? "outline" : "default"}
        >
          {showCreate ? "Hide new requisition" : "New requisition"}
        </Button>
      </div>

      {showCreate ? (
        <CreateRequisitionForm branches={branches} departments={departments} />
      ) : null}

      <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-4">
        <HrField id="req-filter-title" label="Search title">
          <HrTextInput
            id="req-filter-title"
            onChange={(event) => setTitleSearch(event.target.value)}
            placeholder="Filter by title…"
            value={titleSearch}
          />
        </HrField>
        <HrField id="req-filter-status" label="Status">
          <HrSelect
            id="req-filter-status"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="on_hold">On hold</option>
            <option value="closed">Closed</option>
          </HrSelect>
        </HrField>
        <HrField id="req-filter-branch" label="Branch">
          <HrSelect
            id="req-filter-branch"
            onChange={(event) => setBranchFilter(event.target.value)}
            value={branchFilter}
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
        <HrField id="req-filter-department" label="Department">
          <HrSelect
            id="req-filter-department"
            onChange={(event) => setDepartmentFilter(event.target.value)}
            value={departmentFilter}
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </HrSelect>
        </HrField>
      </div>

      <HrTableCard>
        <div className="border-b px-5 py-4">
          <p className="font-medium text-foreground">Requisitions</p>
          <p className="text-sm text-muted-foreground">
            {hasRequisitions
              ? `${filtered.length} shown · open pipeline and hire progress per role`
              : "Create a requisition to start tracking candidates."}
          </p>
        </div>

        {!hasRequisitions ? (
          <div className="px-5 py-10">
            <EmptyState
              description="Use New requisition to add a role, then open the pipeline board from the list."
              title="No requisitions yet"
              variant="flat"
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">No requisitions match the current filters.</div>
        ) : (
          <div className="divide-y">
            {filtered.map((row) => (
              <article
                className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                key={row.id}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      className="font-semibold text-foreground hover:text-primary"
                      href={`/hr/recruitment/${row.id}`}
                    >
                      {row.title}
                    </Link>
                    {requisitionStatusBadge(row.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{formatMeta(row)}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.hiredCount} / {row.headcount} hired · {row.openPipelineCount} in pipeline
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                  <Button render={<Link href={`/hr/recruitment/${row.id}`} />} size="sm" variant="outline">
                    Pipeline
                  </Button>
                  <Button onClick={() => setEditing(row)} size="sm" type="button" variant="outline">
                    {row.status === "closed" ? "View" : "Edit"}
                  </Button>
                  <RequisitionStatusActions row={row} />
                </div>
              </article>
            ))}
          </div>
        )}
      </HrTableCard>

      {editing ? (
        <EditRequisitionDialog
          branches={branches}
          departments={departments}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          open={Boolean(editing)}
          row={editing}
        />
      ) : null}
    </div>
  );
}
