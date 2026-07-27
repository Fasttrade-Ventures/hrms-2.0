"use client";

import { useActionState } from "react";

import {
  generateEaPdfAction,
  updateEmployeeTaxProfileAction,
  type HrActionState,
} from "@/app/(hr)/hr/payroll/actions";
import { HrFormMessage, HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";
import { ExportDownloadMessage } from "@/components/hr/payroll/export-download-message";
import { PortalSectionCard } from "@/components/portal/portal-section";
import type { EmployeeTaxProfile } from "@/lib/payroll/compensation";

const initialState: HrActionState = {};

export function EmployeeTaxProfilePanel({
  employeeId,
  taxProfile,
}: {
  employeeId: string;
  taxProfile: EmployeeTaxProfile;
}) {
  const [state, action, pending] = useActionState(updateEmployeeTaxProfileAction, initialState);
  const [eaState, eaAction, eaPending] = useActionState(generateEaPdfAction, initialState);
  const year = new Date().getFullYear();

  return (
    <div className="space-y-5">
      <PortalSectionCard title="TP1 — Current year reliefs">
        <form action={action} className="grid gap-4 md:grid-cols-2">
          <input name="employeeId" type="hidden" value={employeeId} />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Marital status</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.maritalStatus ?? ""}
              name="maritalStatus"
            >
              <option value="">Not set</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Spouse working</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={
                taxProfile.spouseWorking === null ? "" : taxProfile.spouseWorking ? "yes" : "no"
              }
              name="spouseWorking"
            >
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Qualifying children (from dependents)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-muted/40 px-3"
              disabled
              readOnly
              value={taxProfile.childCount}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Zakat annual (RM) — PCB rebate</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.zakatAnnual}
              name="zakatAnnual"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Zakat monthly (RM) — salary deduction</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.zakatMonthly}
              name="zakatMonthly"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Other annual tax reliefs (RM)</span>
            <p className="text-xs text-muted-foreground">
              TP1 reliefs such as medical, life insurance, lifestyle, SSPN, and education — reduces
              monthly PCB. Not zakat.
            </p>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.otherReliefs}
              name="otherReliefs"
              step="0.01"
              type="number"
            />
          </label>
          <div className="md:col-span-2 space-y-2">
            <HrFormMessage error={state.error} success={state.success} />
            <HrPrimaryButton disabled={pending} type="submit">
              {pending ? "Saving…" : "Save TP1 profile"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>

      <PortalSectionCard title={`TP3 — ${year} opening balances`}>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter previous employer YTD totals for mid-year joiners. These reduce PCB until caught up.
        </p>
        <form action={action} className="grid gap-4 md:grid-cols-3">
          <input name="employeeId" type="hidden" value={employeeId} />
          <input name="saveYtd" type="hidden" value="1" />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">YTD gross (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.ytdGross}
              name="ytdGross"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">YTD EPF employee (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.ytdEpf}
              name="ytdEpf"
              step="0.01"
              type="number"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">YTD PCB (RM)</span>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3"
              defaultValue={taxProfile.ytdPcb}
              name="ytdPcb"
              step="0.01"
              type="number"
            />
          </label>
          <div className="md:col-span-3 rounded-lg border bg-muted/30 p-3 text-sm">
            {taxProfile.openingBalance ? (
              <p className="text-muted-foreground">Opening balance recorded for {year}.</p>
            ) : (
              <p className="text-muted-foreground">No opening balance on file yet.</p>
            )}
          </div>
          <div className="md:col-span-3 space-y-2">
            <HrFormMessage error={state.error} success={state.success} />
            <HrPrimaryButton disabled={pending} type="submit">
              {pending ? "Saving…" : "Save TP3 opening balances"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>

      <PortalSectionCard title="EA PDF — year-end statement">
        <p className="mb-4 text-sm text-muted-foreground">
          Generate Form EA from YTD balances for this employee. Lock payruns during the year to populate totals.
        </p>
        <form action={eaAction} className="flex flex-wrap items-end gap-4">
          <input name="employeeId" type="hidden" value={employeeId} />
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Calendar year</span>
            <HrTextInput defaultValue={year} name="calendarYear" required type="number" />
          </label>
          <div className="space-y-2">
            <ExportDownloadMessage state={eaState} />
            <HrPrimaryButton disabled={eaPending} type="submit">
              {eaPending ? "Generating…" : "Generate EA PDF"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>
    </div>
  );
}
