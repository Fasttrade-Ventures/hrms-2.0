"use client";

import Link from "next/link";
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
  OrgTableShell,
  StatusPill,
} from "@/components/hr/organization/org-ui";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import type { LeaveTypeRow } from "@/lib/hr/organization";

const initialState: OrgActionState = {};

export function LeaveTypesList({ leaveTypes }: { leaveTypes: LeaveTypeRow[] }) {
  const unpaid = leaveTypes.filter((row) => row.isUnpaid).length;
  const withAttachment = leaveTypes.filter((row) => row.requiresAttachment).length;

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
              href="/hr/organization/leave-types/create"
            >
              Add leave type
            </Link>
          </div>
        }
        description="Policies used for apply leave and employee entitlements."
        title="Leave types"
      />

      <OrgStatCards
        items={[
          { label: "Leave types", value: leaveTypes.length, hint: "configured" },
          { label: "Unpaid", value: unpaid, hint: "policies" },
          { label: "Need attachment", value: withAttachment, hint: "e.g. MC" },
        ]}
      />

      <OrgTableShell
        emptyDescription="Create leave types so employees can apply for leave."
        emptyTitle="No leave types yet"
        headers={["Name", "Entitlement", "Flags", "Requests", "Status", "Action"]}
        isEmpty={leaveTypes.length === 0}
      >
        {leaveTypes.map((leaveType) => (
          <div className="grid items-center gap-3 px-3.5 py-3 md:grid-cols-6" key={leaveType.id}>
            <p className="text-sm font-semibold text-[var(--foreground-primary)]">{leaveType.name}</p>
            <p className="text-sm text-[var(--foreground-secondary)]">{leaveType.entitlementDays} days</p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {[
                leaveType.isUnpaid ? "Unpaid" : "Paid",
                leaveType.requiresAttachment ? "Attachment" : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm text-[var(--foreground-muted)]">{leaveType.requestCount}</p>
            <StatusPill label="Active" tone="success" />
            <div>
              <Link
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] px-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
                href={`/hr/organization/leave-types/${leaveType.id}/edit`}
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
          <Link
            className="inline-flex h-10 items-center rounded-[var(--radius-sm)] border border-[var(--border-primary)] bg-[var(--surface-card)] px-4 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/hr/organization/leave-types"
          >
            Back to list
          </Link>
        }
        description="Names must be unique within the organization."
        title={leaveType ? "Edit leave type" : "Create leave type"}
      />

      <OrgFormCard
        backHref="/hr/organization/leave-types"
        description="Leave types appear on employee create and apply-leave screens."
        title={leaveType ? "Edit leave type" : "Create leave type"}
      >
        <form action={formAction} className="space-y-5">
          <HrField id="name" label="Leave type name">
            <HrTextInput defaultValue={leaveType?.name ?? ""} id="name" name="name" required />
          </HrField>
          <HrField id="entitlementDays" label="Default entitlement (days)">
            <HrTextInput
              defaultValue={String(leaveType?.entitlementDays ?? 0)}
              id="entitlementDays"
              min={0}
              name="entitlementDays"
              step="0.5"
              type="number"
            />
          </HrField>
          <div className="space-y-3">
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
