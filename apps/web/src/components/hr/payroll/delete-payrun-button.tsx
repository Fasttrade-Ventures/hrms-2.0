"use client";

import { useActionState, useRef, useState } from "react";

import { ConfirmDialog } from "@hrms/ui";

import { deletePayrunAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage } from "@/components/hr/employees/form-fields";
import { Button } from "@/components/ui/button";

const initialState: HrActionState = {};

export function DeletePayrunButton({
  payrunId,
  periodLabel,
  status,
  size = "default",
  label = "Delete",
}: {
  payrunId: string;
  periodLabel: string;
  status: string;
  size?: "default" | "sm";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deletePayrunAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  if (status === "locked") return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={size}
        type="button"
        variant="outline"
      >
        {label}
      </Button>

      <form action={action} className="hidden" ref={formRef}>
        <input name="payrunId" type="hidden" value={payrunId} />
      </form>

      <ConfirmDialog
        cancelLabel="Keep payrun"
        confirmLabel={pending ? "Deleting…" : "Yes, delete"}
        message={
          state.error
            ? state.error
            : `Delete payrun ${periodLabel}? This removes all calculated lines. Locked payruns cannot be deleted.`
        }
        onCancel={() => setOpen(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        open={open}
        title="Delete this payrun?"
        tone="danger"
      />

      {state.error ? (
        <div className="sr-only">
          <HrFormMessage error={state.error} />
        </div>
      ) : null}
    </>
  );
}
