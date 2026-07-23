"use client";

import { useActionState } from "react";

import { approveRequest, rejectRequest, type ManagerActionState } from "@/app/(manager)/manager/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: ManagerActionState = {};

export function ApprovalActions({ stepId }: { stepId: string }) {
  const [approveState, approveAction, approvePending] = useActionState(approveRequest, initialState);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectRequest, initialState);

  const error = approveState.error || rejectState.error;
  const pending = approvePending || rejectPending;

  return (
    <PortalSectionCard description="Add an optional note for the employee." title="Your decision">
      <form action={approveAction} className="space-y-3">
        <input name="stepId" type="hidden" value={stepId} />
        <label className="block space-y-2">
          <span className="text-[13px] font-medium text-[var(--foreground-primary)]">Comment (optional)</span>
          <textarea
            className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--border-primary)] bg-[var(--surface-muted)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--border-focus)]"
            name="comment"
            placeholder="Add a note for the employee"
          />
        </label>
        <HrPrimaryButton className="rounded-[var(--radius-md)]" disabled={pending} type="submit">
          {approvePending ? "Approving…" : "Approve request"}
        </HrPrimaryButton>
      </form>

      <form action={rejectAction} className="mt-4 space-y-3 border-t border-[var(--border-primary)] pt-4">
        <input name="stepId" type="hidden" value={stepId} />
        <button
          className="flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--danger)] bg-[var(--surface-card)] px-5 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-60"
          disabled={pending}
          type="submit"
        >
          {rejectPending ? "Rejecting…" : "Reject request"}
        </button>
      </form>

      {error ? <HrFormMessage error={error} /> : null}
    </PortalSectionCard>
  );
}
