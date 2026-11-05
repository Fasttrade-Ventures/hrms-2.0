"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";

import { overridePayrunPcbAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: HrActionState = {};

export function EditPcbDialog({
  payrunId,
  payrunItemId,
  currentAmount,
  manualAmount,
}: {
  payrunId?: string;
  payrunItemId: string;
  currentAmount: number;
  manualAmount: number | null;
}) {
  const [state, action, pending] = useActionState(overridePayrunPcbAction, initialState);
  const [saved, setSaved] = useState(false);
  const [pcbMode, setPcbMode] = useState<"auto" | "manual">(
    manualAmount === null ? "auto" : "manual",
  );

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
      <input name="clear" type="hidden" value={pcbMode === "auto" ? "1" : "0"} />
      <div className="flex items-center justify-end gap-1.5">
        <select
          aria-label="PCB calculation"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          name="pcbMode"
          onChange={(event) => setPcbMode(event.target.value === "manual" ? "manual" : "auto")}
          value={pcbMode}
        >
          <option value="auto">Auto (calculated)</option>
          <option value="manual">Use manual amount</option>
        </select>
        {pcbMode === "manual" ? (
          <Input
            aria-label="PCB amount"
            className="h-8 w-20 rounded-md bg-background px-2 text-right text-xs tabular-nums"
            defaultValue={manualAmount ?? currentAmount}
            min={0}
            name="amount"
            required
            step="0.01"
            type="number"
          />
        ) : null}
        <Button
          className={cn(
            "h-8 shrink-0 px-2.5 text-xs font-medium transition-colors",
            saved &&
              "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
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
        <p className="mt-1 max-w-[14rem] text-right text-[10px] leading-tight text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
