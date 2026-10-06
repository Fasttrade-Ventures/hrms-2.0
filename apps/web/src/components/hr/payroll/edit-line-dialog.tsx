"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";

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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (state.success) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <form action={action} className="flex flex-col items-end">
      {payrunId ? <input name="payrunId" type="hidden" value={payrunId} /> : null}
      <input name="payrunItemId" type="hidden" value={payrunItemId} />
      <input name="componentCode" type="hidden" value={componentCode} />
      <div className="flex items-center justify-end gap-1.5">
        <Input
          aria-label={`Basic salary for ${componentCode}`}
          className="h-8 w-20 rounded-md bg-background px-2 text-right text-xs tabular-nums"
          defaultValue={currentAmount}
          min={0}
          name="amount"
          step="0.01"
          type="number"
        />
        <Button
          className={cn(
            "h-8 shrink-0 px-2.5 text-xs font-medium transition-colors",
            saved && "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
          )}
          disabled={pending}
          size="sm"
          type="submit"
          variant={saved ? "outline" : "secondary"}
        >
          {pending ? (
            "..."
          ) : saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
              Saved
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </div>
      {state.error ? (
        <p className="mt-1 max-w-[8.5rem] text-right text-[10px] leading-tight text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
