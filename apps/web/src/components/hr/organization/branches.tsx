"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";

import {
  createBranch,
  deleteBranch,
  updateBranch,
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
import { MALAYSIAN_STATE_OPTIONS } from "@/lib/employees/malaysia-demographics";
import type { BranchRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

function weekendLabel(mode: BranchRow["weekendMode"]) {
  switch (mode) {
    case "fri_sat":
      return "Fri–Sat";
    case "sun_only":
      return "Sun only";
    default:
      return "Sat–Sun";
  }
}

export function BranchesList({ branches }: { branches: BranchRow[] }) {
  const totalEmployees = branches.reduce((sum, row) => sum + row.employeeCount, 0);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/branches/create">Add branch</HrLinkButton>
          </div>
        }
        description="Sites with weekend mode and payroll cutoff settings."
        title="Branches"
      />

      <OrgStatCards
        items={[
          { label: "Branches", value: branches.length, hint: "active sites" },
          { label: "Assigned staff", value: totalEmployees, hint: "with branch set" },
          {
            label: "Avg staff / branch",
            value: branches.length ? Math.round(totalEmployees / branches.length) : 0,
            hint: "approximate",
          },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create your first branch to assign employees and holidays."
        emptyTitle="No branches yet"
        headers={["Name", "Weekend", "Cutoff day", "Staff", "Status", "Action"]}
        isEmpty={branches.length === 0}
      >
        {branches.map((branch) => (
          <OrgTableRow key={branch.id}>
            <OrgTableCell variant="name">
              <span>{branch.name}</span>
              {branch.state ? (
                <span className="mt-0.5 block text-xs font-normal text-[var(--foreground-muted)]">
                  {branch.state}
                </span>
              ) : null}
            </OrgTableCell>
            <OrgTableCell>{weekendLabel(branch.weekendMode)}</OrgTableCell>
            <OrgTableCell>{branch.payrollCutoffDay}</OrgTableCell>
            <OrgTableCell variant="muted">{branch.employeeCount}</OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/branches/${branch.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function BranchForm({ branch }: { branch?: BranchRow }) {
  const boundUpdate = useMemo(
    () => (branch ? updateBranch.bind(null, branch.id) : createBranch),
    [branch],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/branches" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Weekend mode drives working-day calculations; cutoff day scopes payroll."
        title={branch ? "Edit branch" : "Create branch"}
      />

      <OrgFormCard
        backHref="/hr/organization/branches"
        description="Save to make this branch available on employee profiles."
        title={branch ? "Edit branch" : "Create branch"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Branch name">
            <HrTextInput defaultValue={branch?.name ?? ""} id="name" name="name" required />
          </HrField>
          <HrField
            hint="Used to import Malaysia public holidays for this branch."
            id="state"
            label="State / territory"
          >
            <HrSelect defaultValue={branch?.state ?? ""} id="state" name="state">
              <option value="">Not set</option>
              {MALAYSIAN_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </HrSelect>
          </HrField>
          <div className="grid gap-4 md:grid-cols-2">
            <HrField id="weekendMode" label="Weekend mode">
              <HrSelect defaultValue={branch?.weekendMode ?? "sat_sun"} id="weekendMode" name="weekendMode">
                <option value="sat_sun">Saturday–Sunday</option>
                <option value="fri_sat">Friday–Saturday</option>
                <option value="sun_only">Sunday only</option>
              </HrSelect>
            </HrField>
            <HrField id="payrollCutoffDay" label="Payroll cutoff day">
              <HrTextInput
                defaultValue={String(branch?.payrollCutoffDay ?? 6)}
                id="payrollCutoffDay"
                max={28}
                min={1}
                name="payrollCutoffDay"
                required
                type="number"
              />
            </HrField>
          </div>
          <OrgFormActions
            cancelHref="/hr/organization/branches"
            error={state.error}
            extra={
              branch ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the branch. Employees must be reassigned first."
                  confirmTitle={`Delete ${branch.name}?`}
                  label="Delete branch"
                  onDelete={() => deleteBranch(branch.id)}
                  redirectHref="/hr/organization/branches"
                />
              ) : null
            }
            pending={pending}
            submitLabel={branch ? "Save branch" : "Create branch"}
            success={state.success}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
