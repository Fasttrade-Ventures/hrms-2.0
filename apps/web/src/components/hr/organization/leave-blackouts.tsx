"use client";

import { useActionState } from "react";

import {
  createLeaveBlackout,
  deleteLeaveBlackout,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  OrgDeleteButton,
  OrgFormActions,
  OrgFormCard,
  OrgTableCell,
  OrgTableRow,
  OrgTableShell,
} from "@/components/hr/organization/org-ui";
import { HrField, HrTextInput } from "@/components/hr/employees/form-fields";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { LeaveBlackoutRow } from "@/lib/leave/blackout";
import type { LeaveTypeRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function LeaveBlackoutsList({
  blackouts,
  leaveTypes,
}: {
  blackouts: LeaveBlackoutRow[];
  leaveTypes: LeaveTypeRow[];
}) {
  const [state, action, pending] = useActionState(createLeaveBlackout, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization" variant="outline">
            Back to hub
          </HrLinkButton>
        }
        description="Block leave applications during peak periods. Applies to employee self-service and HR apply-behalf."
        title="Leave blackout periods"
      />

      {state.error ? <p className="text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-[var(--success)]">{state.success}</p> : null}

      <OrgTableShell
        emptyDescription="Create blackout periods to prevent leave during busy seasons."
        emptyTitle="No blackout periods"
        headers={["Name", "Dates", "Leave types", "Action"]}
        isEmpty={blackouts.length === 0}
      >
        {blackouts.map((blackout) => (
          <OrgTableRow key={blackout.id}>
            <OrgTableCell variant="name">{blackout.name}</OrgTableCell>
            <OrgTableCell>
              {blackout.startDate} → {blackout.endDate}
            </OrgTableCell>
            <OrgTableCell variant="muted">
              {blackout.leaveTypeNames.length ? blackout.leaveTypeNames.join(", ") : "All leave types"}
            </OrgTableCell>
            <OrgTableCell>
              <OrgDeleteButton
                confirmDescription="Employees will be able to apply for leave in this range again."
                confirmTitle={`Delete ${blackout.name}?`}
                label="Delete"
                onDelete={() => deleteLeaveBlackout(blackout.id)}
              />
            </OrgTableCell>
          </OrgTableRow>
        ))}
      </OrgTableShell>

      <OrgFormCard
        backHref="/hr/organization"
        description="Create blackout periods to prevent leave during busy seasons."
        title="Add blackout"
      >
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <HrField id="blackout-name" label="Name">
              <HrTextInput id="blackout-name" name="name" placeholder="Year-end freeze" required />
            </HrField>
            <HrField id="blackout-start" label="Start date">
              <HrTextInput id="blackout-start" name="startDate" required type="date" />
            </HrField>
            <HrField id="blackout-end" label="End date">
              <HrTextInput id="blackout-end" name="endDate" required type="date" />
            </HrField>
          </div>

          {leaveTypes.length ? (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-[var(--foreground-primary)]">
                Leave types (leave empty for all)
              </legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {leaveTypes.map((leaveType) => (
                  <label className="flex items-center gap-2 text-sm" key={leaveType.id}>
                    <input name="leaveTypeIds" type="checkbox" value={leaveType.id} />
                    {leaveType.name}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <OrgFormActions cancelHref="/hr/organization/leave-blackouts" pending={pending} submitLabel="Add blackout" />
        </form>
      </OrgFormCard>
    </div>
  );
}
