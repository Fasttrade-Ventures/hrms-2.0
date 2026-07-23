"use client";

import { useActionState } from "react";

import { lockPayrunAction, type HrActionState } from "@/app/(hr)/hr/actions";
import { HrFormMessage, HrPrimaryButton } from "@/components/hr/employees/form-fields";

const initialState: HrActionState = {};

export function LockPayrunButton({ payrunId }: { payrunId: string }) {
  const [state, action, pending] = useActionState(lockPayrunAction, initialState);

  return (
    <form action={action} className="space-y-3">
      <input name="payrunId" type="hidden" value={payrunId} />
      <HrFormMessage error={state.error} success={state.success} />
      <HrPrimaryButton disabled={pending} type="submit">
        {pending ? "Locking…" : "Lock payrun"}
      </HrPrimaryButton>
    </form>
  );
}
