"use client";

import { useActionState } from "react";

import { editPayrunLineAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: HrActionState = {};

export function EditLineDialog({
  payrunId,
  payrunItemId,
  componentCode,
  currentAmount,
}: {
  payrunId?: string;
  payrunItemId: string;
  componentCode: string;
  currentAmount: number;
}) {
  const [state, action, pending] = useActionState(editPayrunLineAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-1">
      {payrunId ? <input name="payrunId" type="hidden" value={payrunId} /> : null}
      <input name="payrunItemId" type="hidden" value={payrunItemId} />
      <input name="componentCode" type="hidden" value={componentCode} />
      <div className="flex items-center gap-1.5">
        <Input
          aria-label={`Basic salary for ${componentCode}`}
          className="h-8 w-[5.75rem] bg-background px-2 text-xs tabular-nums"
          defaultValue={currentAmount}
          min={0}
          name="amount"
          step="0.01"
          type="number"
        />
        <Button
          className="h-8 shrink-0 px-2.5 text-xs"
          disabled={pending}
          size="sm"
          type="submit"
          variant="secondary"
        >
          {pending ? "…" : "Save"}
        </Button>
      </div>
      {state.error || state.success ? (
        <p
          className={cn(
            "max-w-[8.5rem] text-[10px] leading-tight",
            state.error ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {state.error ?? state.success}
        </p>
      ) : null}
    </form>
  );
}
