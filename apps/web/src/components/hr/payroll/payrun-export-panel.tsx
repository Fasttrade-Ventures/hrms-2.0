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

const initialState: HrActionState = {};

export function PayrunExportPanel({
  payrunId,
  status,
  branches,
}: {
  payrunId: string;
  status: string;
  branches: Array<{ id: string; name: string }>;
}) {
  const [bankState, bankAction, bankPending] = useActionState(exportBankAction, initialState);
  const [statState, statAction, statPending] = useActionState(exportStatutoryAction, initialState);
  const exportable = status === "approved" || status === "locked";

  return (
    <PortalSectionCard title="Exports (per branch)">
      {!exportable ? (
        <p className="mb-4 text-sm text-amber-700">Approve the payrun before generating bank or statutory files.</p>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
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
            <option value="epf">EPF</option>
            <option value="socso">SOCSO + EIS</option>
            <option value="pcb">PCB</option>
            <option value="hrdf">HRDF</option>
          </HrSelect>
          <ExportDownloadMessage state={statState} />
          <HrPrimaryButton disabled={!exportable || statPending} type="submit">
            {statPending ? "Generating…" : "Generate statutory file"}
          </HrPrimaryButton>
        </form>
      </div>
    </PortalSectionCard>
  );
}
