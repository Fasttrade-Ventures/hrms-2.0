"use client";

import { useActionState } from "react";

import {
  exportBankAction,
  exportStatutoryAction,
  type HrActionState,
} from "@/app/(hr)/hr/payroll/actions";
import { HrPrimaryButton, HrSelect } from "@/components/hr/employees/form-fields";
import { ExportDownloadMessage } from "@/components/hr/payroll/export-download-message";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { statutoryExportOptionsFor, type PayrollCountry } from "@/lib/payroll/export-options";

const initialState: HrActionState = {};

export function PayrunExportPanel({
  payrunId,
  status,
  branches,
  country = "MY",
}: {
  payrunId: string;
  status: string;
  country?: PayrollCountry;
  branches: Array<{ id: string; name: string }>;
}) {
  const [bankState, bankAction, bankPending] = useActionState(exportBankAction, initialState);
  const [statState, statAction, statPending] = useActionState(exportStatutoryAction, initialState);
  const statutoryOptions = statutoryExportOptionsFor(country);
  const exportable = status === "approved" || status === "locked";

  return (
    <PortalSectionCard title="Exports (per branch)">
      {!exportable ? (
        <p className="mb-4 text-sm text-amber-700">
          {statutoryOptions.length > 0
            ? "Approve the payrun before generating bank or statutory files."
            : "Approve the payrun before generating bank files."}
        </p>
      ) : null}
      <div className={statutoryOptions.length > 0 ? "grid gap-6 md:grid-cols-2" : "grid gap-6"}>
        <form action={bankAction} className="space-y-3">
          <input name="payrunId" type="hidden" value={payrunId} />
          <HrSelect defaultValue="" name="branchId">
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </HrSelect>
          <HrSelect defaultValue="bank_csv" name="format">
            <option value="bank_csv">Bank CSV</option>
            <option value="bank_maybank">Maybank</option>
            <option value="bank_cimb">CIMB</option>
          </HrSelect>
          <ExportDownloadMessage state={bankState} />
          <HrPrimaryButton disabled={!exportable || bankPending} type="submit">
            {bankPending ? "Generating…" : "Generate bank file"}
          </HrPrimaryButton>
        </form>

        {statutoryOptions.length > 0 ? (
          <form action={statAction} className="space-y-3">
            <input name="payrunId" type="hidden" value={payrunId} />
            <HrSelect defaultValue="" name="branchId">
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </HrSelect>
            <HrSelect defaultValue="epf" name="statutoryType">
              {statutoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </HrSelect>
            <ExportDownloadMessage state={statState} />
            <HrPrimaryButton disabled={!exportable || statPending} type="submit">
              {statPending ? "Generating…" : "Generate statutory file"}
            </HrPrimaryButton>
          </form>
        ) : null}
      </div>
    </PortalSectionCard>
  );
}
