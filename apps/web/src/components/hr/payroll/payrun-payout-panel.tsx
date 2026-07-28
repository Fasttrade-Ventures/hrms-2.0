"use client";

import { useActionState } from "react";

import {
  reconcilePayoutUploadAction,
  updatePayoutItemStatusAction,
  type PayoutActionState,
} from "@/app/(hr)/hr/payroll/payout-actions";
import { HrFormMessage, HrGhostButton, HrPrimaryButton } from "@/components/hr/employees/form-fields";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { StatusPill } from "@hrms/ui";

const initialState: PayoutActionState = {};

type PayoutItem = {
  id: string;
  reference: string;
  amount: number;
  status: string;
  failure_reason: string | null;
  paid_at: string | null;
  employees:
    | { full_name: string; employee_number: string }
    | { full_name: string; employee_number: string }[]
    | null;
};

type PayoutBatch = {
  id: string;
  status: string;
  bank_format: string;
  submitted_at: string | null;
  reconciled_at: string | null;
};

function itemTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "paid") return "success";
  if (status === "failed") return "danger";
  if (status === "submitted") return "warning";
  return "neutral";
}

export function PayrunPayoutPanel({
  payrunId,
  batch,
  items,
  payoutsEnabled,
}: {
  payrunId: string;
  batch: PayoutBatch | null;
  items: PayoutItem[];
  payoutsEnabled: boolean;
}) {
  const [uploadState, uploadAction, uploadPending] = useActionState(reconcilePayoutUploadAction, initialState);
  const [statusState, statusAction, statusPending] = useActionState(updatePayoutItemStatusAction, initialState);

  if (!payoutsEnabled) {
    return (
      <PortalSectionCard title="Payout reconciliation">
        <p className="text-sm text-muted-foreground">
          Enable the payouts module to reconcile bank transfer responses for this payrun.
        </p>
      </PortalSectionCard>
    );
  }

  if (!batch) {
    return (
      <PortalSectionCard title="Payout reconciliation">
        <p className="text-sm text-muted-foreground">
          Payout batch is created when the payrun is locked.
        </p>
      </PortalSectionCard>
    );
  }

  return (
    <PortalSectionCard title="Payout reconciliation">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusPill label={batch.status} tone={batch.status === "reconciled" ? "success" : "warning"} />
        <span className="text-sm text-muted-foreground">Format: {batch.bank_format}</span>
      </div>

      <form action={uploadAction} className="mb-6 space-y-3 rounded-lg border p-4">
        <input name="batchId" type="hidden" value={batch.id} />
        <input name="payrunId" type="hidden" value={payrunId} />
        <label className="text-sm font-medium" htmlFor="responseFile">
          Upload bank response file
        </label>
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
          id="responseFile"
          name="content"
          placeholder="Paste Maybank pipe-delimited or CIMB CSV response content"
          required
          rows={4}
        />
        <HrPrimaryButton disabled={uploadPending} type="submit">
          {uploadPending ? "Reconciling…" : "Reconcile from upload"}
        </HrPrimaryButton>
        <HrFormMessage error={uploadState.error} success={uploadState.success} />
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Employee</th>
              <th className="py-2 pr-4">Reference</th>
              <th className="py-2 pr-4">Amount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
              return (
                <tr className="border-b" key={item.id}>
                  <td className="py-2 pr-4">{employee?.full_name ?? "—"}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{item.reference}</td>
                  <td className="py-2 pr-4">RM {Number(item.amount).toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <StatusPill label={item.status} tone={itemTone(item.status)} />
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {(["paid", "failed", "pending"] as const).map((status) => (
                        <form action={statusAction} key={status}>
                          <input name="itemId" type="hidden" value={item.id} />
                          <input name="payrunId" type="hidden" value={payrunId} />
                          <input name="status" type="hidden" value={status} />
                          <HrGhostButton disabled={statusPending} type="submit">
                            {status}
                          </HrGhostButton>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HrFormMessage error={statusState.error} success={statusState.success} />
    </PortalSectionCard>
  );
}
