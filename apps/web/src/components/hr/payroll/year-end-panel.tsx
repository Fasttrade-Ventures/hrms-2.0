"use client";

import { useActionState } from "react";

import { generateCp8dAction, generateEaPdfBulkAction, type HrActionState } from "@/app/(hr)/hr/payroll/actions";
import { HrPrimaryButton, HrTextInput } from "@/components/hr/employees/form-fields";
import { ExportDownloadMessage } from "@/components/hr/payroll/export-download-message";
import { PortalSectionCard } from "@/components/portal/portal-section";

const initialState: HrActionState = {};

export function YearEndPanel({ branches }: { branches: Array<{ id: string; name: string }> }) {
  const year = new Date().getFullYear();
  const [cp8dState, cp8dAction, cp8dPending] = useActionState(generateCp8dAction, initialState);
  const [eaBulkState, eaBulkAction, eaBulkPending] = useActionState(generateEaPdfBulkAction, initialState);

  return (
    <div className="space-y-6">
      <PortalSectionCard title="CP8D export">
        <form action={cp8dAction} className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Calendar year</span>
            <HrTextInput defaultValue={year} name="calendarYear" required type="number" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Branch (optional)</span>
            <select className="flex h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm" name="branchId">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2 md:col-span-3">
            <ExportDownloadMessage state={cp8dState} />
            <HrPrimaryButton disabled={cp8dPending} type="submit">
              {cp8dPending ? "Generating…" : "Generate CP8D CSV"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>

      <PortalSectionCard
        description="Generates EA PDFs for all employees with YTD balances and returns a manifest CSV with download links. For a single employee, use the EA PDF form on their profile under Payroll → Tax (TP1/TP3)."
        title="Bulk EA PDF export"
      >
        <form action={eaBulkAction} className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Calendar year</span>
            <HrTextInput defaultValue={year} name="calendarYear" required type="number" />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="text-muted-foreground">Branch (optional)</span>
            <select className="flex h-10 w-full rounded-lg border border-input bg-muted/40 px-3 text-sm" name="branchId">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <div className="space-y-2 md:col-span-3">
            <ExportDownloadMessage state={eaBulkState} />
            <HrPrimaryButton disabled={eaBulkPending} type="submit">
              {eaBulkPending ? "Generating…" : "Generate EA PDFs (bulk)"}
            </HrPrimaryButton>
          </div>
        </form>
      </PortalSectionCard>
    </div>
  );
}
