"use client";

import { useActionState, useMemo } from "react";

import {
  createLeaveType,
  deleteLeaveType,
  updateLeaveType,
  type OrgActionState,
} from "@/app/(hr)/hr/organization/actions";
import {
  HrCheckbox,
  HrField,
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
import type { LeaveTypeRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function LeaveTypesList({ leaveTypes }: { leaveTypes: LeaveTypeRow[] }) {
  const unpaid = leaveTypes.filter((row) => row.isUnpaid).length;
  const withAttachment = leaveTypes.filter((row) => row.requiresAttachment).length;
  const withAccrual = leaveTypes.filter((row) => row.accrualFrequency === "monthly").length;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <div className="flex gap-2">
            <HrLinkButton href="/hr/organization" variant="outline">
              Back to hub
            </HrLinkButton>
            <HrLinkButton href="/hr/organization/leave-types/create">Add leave type</HrLinkButton>
          </div>
        }
        description="Policies used for apply leave, automated accrual, and employee entitlements."
        title="Leave types"
      />

      <OrgStatCards
        items={[
          { label: "Leave types", value: leaveTypes.length, hint: "configured" },
          { label: "Monthly accrual", value: withAccrual, hint: "automated jobs" },
          { label: "Unpaid", value: unpaid, hint: "policies" },
          { label: "Need attachment", value: withAttachment, hint: "e.g. MC" },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create leave types so employees can apply for leave."
        emptyTitle="No leave types yet"
        headers={["Name", "Entitlement", "Accrual & Carry-Forward", "Flags", "Requests", "Status", "Action"]}
        isEmpty={leaveTypes.length === 0}
      >
        {leaveTypes.map((leaveType) => (
          <OrgTableRow key={leaveType.id}>
            <OrgTableCell variant="name">{leaveType.name}</OrgTableCell>
            <OrgTableCell>{leaveType.entitlementDays} days</OrgTableCell>
            <OrgTableCell variant="muted">
              <div className="text-xs space-y-0.5">
                <div>
                  {leaveType.accrualFrequency === "monthly"
                    ? `Monthly (${leaveType.monthlyAccrualRate} d/mo)`
                    : "Upfront annual"}
                </div>
                {leaveType.carryForwardEnabled ? (
                  <div className="text-[var(--foreground-muted)]">
                    Carry-over: max {leaveType.maxCarryForwardDays}d
                    {leaveType.carryForwardExpiryCutoffDate ? ` (exp ${leaveType.carryForwardExpiryCutoffDate})` : ""}
                  </div>
                ) : null}
              </div>
            </OrgTableCell>
            <OrgTableCell variant="muted">
              {[
                leaveType.isUnpaid ? "Unpaid" : "Paid",
                leaveType.requiresAttachment ? "Attachment" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </OrgTableCell>
            <OrgTableCell variant="muted">{leaveType.requestCount}</OrgTableCell>
            <OrgTableStatus />
            <OrgTableEditLink href={`/hr/organization/leave-types/${leaveType.id}/edit`} />
          </OrgTableRow>
        ))}
      </OrgTableShell>
    </div>
  );
}

export function LeaveTypeForm({ leaveType }: { leaveType?: LeaveTypeRow }) {
  const boundUpdate = useMemo(
    () => (leaveType ? updateLeaveType.bind(null, leaveType.id) : createLeaveType),
    [leaveType],
  );
  const [state, formAction, pending] = useActionState(boundUpdate, initialState);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/organization/leave-types" variant="outline">
            Back to list
          </HrLinkButton>
        }
        description="Names must be unique within the organization."
        title={leaveType ? "Edit leave type" : "Create leave type"}
      />

      <OrgFormCard
        backHref="/hr/organization/leave-types"
        description="Leave types appear on employee create and apply-leave screens."
        title={leaveType ? "Edit leave type" : "Create leave type"}
      >
        <form action={formAction} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Basic Details</h3>
            <HrField id="name" label="Leave type name">
              <HrTextInput defaultValue={leaveType?.name ?? ""} id="name" name="name" required />
            </HrField>
            <HrField id="entitlementDays" label="Default annual entitlement (days)">
              <HrTextInput
                defaultValue={String(leaveType?.entitlementDays ?? 0)}
                id="entitlementDays"
                min={0}
                name="entitlementDays"
                step="0.5"
                type="number"
              />
            </HrField>
            <div className="space-y-3 pt-1">
              <HrCheckbox
                defaultChecked={leaveType?.requiresAttachment ?? false}
                id="requiresAttachment"
                label="Requires attachment (e.g. medical certificate)"
                name="requiresAttachment"
              />
              <HrCheckbox
                defaultChecked={leaveType?.isUnpaid ?? false}
                id="isUnpaid"
                label="Unpaid leave"
                name="isUnpaid"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border-secondary)] pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Accrual Automation Policy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HrField id="accrualFrequency" label="Accrual frequency">
                <select
                  className="w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-primary)] px-3 py-2 text-sm text-[var(--foreground-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  defaultValue={leaveType?.accrualFrequency ?? "none"}
                  id="accrualFrequency"
                  name="accrualFrequency"
                >
                  <option value="none">None (Upfront annual allocation)</option>
                  <option value="monthly">Monthly scheduled accrual</option>
                  <option value="yearly">Yearly accrual</option>
                </select>
              </HrField>
              <HrField id="monthlyAccrualRate" label="Monthly accrual rate (days/month)">
                <HrTextInput
                  defaultValue={String(leaveType?.monthlyAccrualRate ?? 0)}
                  id="monthlyAccrualRate"
                  min={0}
                  name="monthlyAccrualRate"
                  step="0.01"
                  type="number"
                />
              </HrField>
            </div>
          </div>

          <div className="border-t border-[var(--border-secondary)] pt-4 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--foreground-primary)]">Year-End Carry-Forward & Expiry</h3>
            <div className="space-y-3">
              <HrCheckbox
                defaultChecked={leaveType?.carryForwardEnabled ?? false}
                id="carryForwardEnabled"
                label="Allow unused leave carry-forward to next year"
                name="carryForwardEnabled"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <HrField id="maxCarryForwardDays" label="Maximum carry-forward days">
                <HrTextInput
                  defaultValue={String(leaveType?.maxCarryForwardDays ?? 0)}
                  id="maxCarryForwardDays"
                  min={0}
                  name="maxCarryForwardDays"
                  step="0.5"
                  type="number"
                />
              </HrField>
              <HrField id="carryForwardExpiryCutoffDate" label="Carry-forward expiry cutoff (MM-DD)">
                <HrTextInput
                  defaultValue={leaveType?.carryForwardExpiryCutoffDate ?? "06-30"}
                  id="carryForwardExpiryCutoffDate"
                  name="carryForwardExpiryCutoffDate"
                  placeholder="06-30"
                />
              </HrField>
            </div>
          </div>

          <OrgFormActions
            cancelHref="/hr/organization/leave-types"
            error={state.error}
            extra={
              leaveType ? (
                <OrgDeleteButton
                  confirmDescription="This permanently removes the leave type. Existing leave requests must not reference it."
                  confirmTitle={`Delete ${leaveType.name}?`}
                  label="Delete leave type"
                  onDelete={() => deleteLeaveType(leaveType.id)}
                  redirectHref="/hr/organization/leave-types"
                />
              ) : null
            }
            pending={pending}
            submitLabel={leaveType ? "Save leave type" : "Create leave type"}
            success={state.success}
          />
        </form>
      </OrgFormCard>
    </div>
  );
}
