"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  createPosition,
  deletePosition,
  updatePosition,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrCheckbox,
  HrField,
  HrSelect,
  HrTextInput,
  HrTextarea,
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgStatCards,
  OrgTableCell,
  OrgTableEditLink,
  OrgTableRow,
  OrgTableShell,
  OrgTableStatus,
} from "@/components/hr/organization/org-ui";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { PositionRow, DepartmentRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function PositionsList({ positions }: { positions: PositionRow[] }) {
  const totalEmployees = positions.reduce((sum, row) => sum + row.employeeCount, 0);
  const activeCount = positions.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/positions/create">Add position</HrLinkButton>
          </div>
        }
        description="Standardized job titles catalog for employees and recruitment."
        title="Positions & Job Titles"
      />

      <OrgStatCards
        items={[
          { label: "Total positions", value: positions.length, hint: "in catalog" },
          { label: "Active roles", value: activeCount, hint: "available for assignment" },
          { label: "Assigned staff", value: totalEmployees, hint: "holding a position" },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create positions in the catalog so employee job titles are standardized across the organization."
        emptyTitle="No positions yet"
        headers={["Title", "Department", "Staff", "Created", "Status", "Action"]}
        isEmpty={positions.length === 0}
      >
        {positions.map((position) => (
          <OrgTableRow key={position.id}>
            <OrgTableCell variant="name">{position.title}</OrgTableCell>
            <OrgTableCell>{position.departmentName ?? "Org-wide"}</OrgTableCell>
            <OrgTableCell variant="muted">{position.employeeCount}</OrgTableCell>
            <OrgTableCell variant="muted">
              {formatDate(position.createdAt)}
            </OrgTableCell>
            <OrgTableStatus label={position.isActive ? "Active" : "Inactive"} />
            <OrgTableEditLink href={`/hr/organization/positions/${position.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function PositionForm({
  position,
  departments,
}: {
  position?: PositionRow;
  departments: DepartmentRow[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const boundUpdate = useMemo(
    () => (position ? updatePosition.bind(null, position.id) : createPosition),
    [position],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  useEffect(() => {
    if (!position && state.success) {
      setShowSuccessModal(true);
    }
  }, [position, state.success]);

  const handleAddAnother = () => {
    setShowSuccessModal(false);
    formRef.current?.reset();
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/positions" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Standardize position titles across onboarding, employee profiles, and payroll."
        title={position ? "Edit position" : "Create position"}
      />

      <OrgFormCard
        backHref="/hr/organization/positions"
        description="Positions appear in employee profile selection and job offers."
        title={position ? "Edit position" : "Create position"}
      >
        <form
          action={formAction}
          className="space-y-5"
          key={position ? `${position.id}-${position.updatedAt ?? position.title}` : "create"}
          ref={formRef}
        >
          <HrField id="title" label="Position title">
            <HrTextInput
              defaultValue={position?.title ?? ""}
              id="title"
              name="title"
              placeholder="e.g. Senior Software Engineer"
              required
            />
          </HrField>

          <HrField hint="Optional — link this role to a specific department." id="departmentId" label="Department">
            <HrSelect defaultValue={position?.departmentId ?? ""} id="departmentId" name="departmentId">
              <option value="">Org-wide / All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} {department.branchName ? `(${department.branchName})` : ""}
                </option>
              ))}
            </HrSelect>
          </HrField>

          <HrField hint="Optional description of the role scope or duties." id="description" label="Description">
            <HrTextarea
              defaultValue={position?.description ?? ""}
              id="description"
              name="description"
              placeholder="Brief summary of duties or requirements"
            />
          </HrField>

          <div className="pt-1">
            <HrCheckbox
              defaultChecked={position?.isActive ?? true}
              id="isActive"
              label="Active position (selectable in employee onboarding and profile forms)"
              name="isActive"
            />
          </div>

          <OrgFormActions
            cancelHref="/hr/organization/positions"
            error={state.error}
            extra={
              position ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the position. Assigned employees must be reassigned first."
                  confirmTitle={`Delete ${position.title}?`}
                  label="Delete position"
                  onDelete={() => deletePosition(position.id)}
                  redirectHref="/hr/organization/positions"
                />
              ) : null
            }
            pending={pending}
            submitLabel={position ? "Save position" : "Create position"}
            success={position ? state.success : undefined}
          />
        </form>
      </OrgFormCard>

      <Dialog onOpenChange={setShowSuccessModal} open={showSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg">Position Created Successfully</DialogTitle>
            <DialogDescription className="text-center text-sm">
              {state.success ?? "The position has been added to your catalog."} It is now available for employee onboarding and profile assignment.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button onClick={handleAddAnother} type="button" variant="outline">
              Add Another Position
            </Button>
            <HrLinkButton href="/hr/organization/positions">
              View Positions List
            </HrLinkButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

