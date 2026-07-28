"use client";

import { useActionState, useMemo } from "react";

import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrField,
  HrSelect,
  HrTextInput,
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
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { DepartmentRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function DepartmentsList({ departments }: { departments: DepartmentRow[] }) {
  const totalEmployees = departments.reduce((sum, row) => sum + row.employeeCount, 0);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/departments/create">Add department</HrLinkButton>
          </div>
        }
        description="Teams optionally scoped to a branch."
        title="Departments"
      />

      <OrgStatCards
        items={[
          { label: "Departments", value: departments.length, hint: "across org" },
          { label: "Assigned staff", value: totalEmployees, hint: "with department set" },
          {
            label: "Branch-linked",
            value: departments.filter((row) => row.branchId).length,
            hint: "tied to a site",
          },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create departments so employees can be assigned to teams."
        emptyTitle="No departments yet"
        headers={["Name", "Branch", "Staff", "Created", "Status", "Action"]}
        isEmpty={departments.length === 0}
      >
        {departments.map((department) => (
          <OrgTableRow key={department.id}>
            <OrgTableCell variant="name">{department.name}</OrgTableCell>
            <OrgTableCell>{department.branchName ?? "Org-wide"}</OrgTableCell>
            <OrgTableCell variant="muted">{department.employeeCount}</OrgTableCell>
            <OrgTableCell variant="muted">
              {new Date(department.createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/departments/${department.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function DepartmentForm({
  department,
  branches,
}: {
  department?: DepartmentRow;
  branches: Array<{ id: string; name: string }>;
}) {
  const boundUpdate = useMemo(
    () => (department ? updateDepartment.bind(null, department.id) : createDepartment),
    [department],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/departments" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Leave branch empty for an org-wide department."
        title={department ? "Edit department" : "Create department"}
      />

      <OrgFormCard
        backHref="/hr/organization/departments"
        description="Departments appear in employee create and edit forms."
        title={department ? "Edit department" : "Create department"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Department name">
            <HrTextInput defaultValue={department?.name ?? ""} id="name" name="name" required />
          </HrField>
          <HrField hint="Optional — scope this team to one site." id="branchId" label="Branch">
            <HrSelect defaultValue={department?.branchId ?? ""} id="branchId" name="branchId">
              <option value="">Org-wide</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </HrSelect>
          </HrField>
          <OrgFormActions
            cancelHref="/hr/organization/departments"
            error={state.error}
            extra={
              department ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the department. Employees must be reassigned first."
                  confirmTitle={`Delete ${department.name}?`}
                  label="Delete department"
                  onDelete={() => deleteDepartment(department.id)}
                  redirectHref="/hr/organization/departments"
                />
              ) : null
            }
            pending={pending}
            submitLabel={department ? "Save department" : "Create department"}
            success={state.success}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
