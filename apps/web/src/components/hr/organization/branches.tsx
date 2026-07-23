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
  OrgTableShell,
  StatusPill,
} from "@/components/hr/organization/org-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
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
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
              href="/hr/organization"
            >
              Back to hub
            </Link>
            <Link
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--accent-hover)]"
              href="/hr/organization/branches/create"
            >
              Add branch
            </Link>
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
          <div className="grid items-center gap-3 px-3.5 py-3 md:grid-cols-6" key={branch.id}>
            <p className="text-sm font-semibold text-[var(--foreground-primary)]">{branch.name}</p>
            <p className="text-sm text-[var(--foreground-secondary)]">{weekendLabel(branch.weekendMode)}</p>
            <p className="text-sm text-[var(--foreground-secondary)]">{branch.payrollCutoffDay}</p>
            <p className="text-sm text-[var(--foreground-muted)]">{branch.employeeCount}</p>
            <StatusPill label="Active" tone="success" />
            <div>
              <Link
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
                href={`/hr/organization/branches/${branch.id}/edit`}
              >
                Edit
              </Link>
            </div>
          </div>
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
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/organization/branches"
          >
            Back to list
          </Link>
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
