"use client";

import { useActionState, useEffect, useState } from "react";
import { Check } from "lucide-react";

import { overridePayrunPcbAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: HrActionState = {};

function formatRm(amount: number) {
  return amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function EditPcbDialog({
  payrunId,
  payrunItemId,
  currentAmount,
  autoAmount,
  manualAmount,
}: {
  payrunId?: string;
  payrunItemId: string;
  currentAmount: number;
  /** LHDN auto PCB for this period (shown even when a manual override is active). */
  autoAmount: number | null;
  manualAmount: number | null;
}) {
  const [state, action, pending] = useActionState(overridePayrunPcbAction, initialState);
  const [saved, setSaved] = useState(false);
  const [pcbMode, setPcbMode] = useState<"auto" | "manual">(
    manualAmount === null ? "auto" : "manual",
  );

  const resolvedAuto =
    autoAmount !== null && Number.isFinite(autoAmount)
      ? autoAmount
      : manualAmount === null
        ? currentAmount
        : null;

  useEffect(() => {
    if (state.success) {
      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [state.success]);

  return (
    <form action={action} className="flex w-full min-w-0 max-w-full flex-col items-stretch gap-1.5">
      {payrunId ? <input name="payrunId" type="hidden" value={payrunId} /> : null}
      <input name="payrunItemId" type="hidden" value={payrunItemId} />
      <input name="clear" type="hidden" value={pcbMode === "auto" ? "1" : "0"} />
      <div className="min-w-0 space-y-0.5 text-right text-[10px] leading-snug tabular-nums">
        {pcbMode === "auto" ? (
          <p className="truncate text-foreground" title={`Auto RM ${formatRm(resolvedAuto ?? currentAmount)}`}>
            Auto <span className="font-medium">{formatRm(resolvedAuto ?? currentAmount)}</span>
          </p>
        ) : (
          <>
            <p className="truncate text-foreground" title={`Applied RM ${formatRm(currentAmount)}`}>
              Applied <span className="font-medium">{formatRm(currentAmount)}</span>
            </p>
            {resolvedAuto !== null ? (
              <p className="truncate text-muted-foreground" title={`Auto RM ${formatRm(resolvedAuto)}`}>
                Auto {formatRm(resolvedAuto)}
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        <select
          aria-label="PCB calculation"
          className="h-8 max-w-full min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[11px]"
          name="pcbMode"
          onChange={(event) => setPcbMode(event.target.value === "manual" ? "manual" : "auto")}
          value={pcbMode}
        >
          <option value="auto">Auto</option>
          <option value="manual">Manual</option>
        </select>
        {pcbMode === "manual" ? (
          <Input
            aria-label="PCB amount"
            className="h-8 w-[5.5rem] shrink-0 rounded-md bg-background px-2 text-right text-xs tabular-nums"
            defaultValue={Number(manualAmount ?? currentAmount).toFixed(2)}
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
        <p className="text-right text-[10px] leading-tight text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
