"use client";

import { useActionState } from "react";

import {
  approvePayrunAction,
  lockPayrunAction,
  submitPayrunAction,
  type HrActionState,
} from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

function WorkflowForm({
  payrunId,
  action,
  label,
  pendingLabel,
}: {
  payrunId: string;
  action: typeof submitPayrunAction;
  label: string;
  pendingLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <input name="payrunId" type="hidden" value={payrunId} />
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? pendingLabel : label}
      </HrPrimaryButton>
    </form>
  );
}

export function PayrunWorkflowActions({ payrunId, status }: { payrunId: string; status: string }) {
  if (status === "locked") return null;

  return (
    <div className="flex flex-wrap gap-4">
      {status === "draft" ? (
        <WorkflowForm
          action={submitPayrunAction}
          label="Submit for review"
          payrunId={payrunId}
          pendingLabel="Submitting…"
        />
      ) : null}
      {status === "in_review" ? (
        <WorkflowForm
          action={approvePayrunAction}
          label="Approve payrun"
          payrunId={payrunId}
          pendingLabel="Approving…"
        />
      ) : null}
      {status === "approved" ? (
        <WorkflowForm
          action={lockPayrunAction}
          label="Lock payrun"
          payrunId={payrunId}
          pendingLabel="Locking…"
        />
      ) : null}
    </div>
  );
}
