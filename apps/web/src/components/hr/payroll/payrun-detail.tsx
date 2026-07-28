import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { PayrunBukucloudPanel } from "@/components/hr/payroll/payrun-bukucloud-panel";
import { PayrunExportPanel } from "@/components/hr/payroll/payrun-export-panel";
import { PayrunPayoutPanel } from "@/components/hr/payroll/payrun-payout-panel";
import { PayrunWorkflowActions } from "@/components/hr/payroll/payrun-workflow-actions";
import { PayrunLinesTable } from "@/components/hr/payroll/payrun-lines-table";
import { PayrunTotalsSummary } from "@/components/hr/payroll/payrun-totals-summary";
import { PayrunCalculatorCompare } from "@/components/hr/payroll/payrun-calculator-compare";
import { DeletePayrunButton } from "@/components/hr/payroll/delete-payrun-button";
import type { BukucloudSyncStatus } from "@/lib/integrations/bukucloud/sync";
import type { PayrunDetail } from "@/lib/payroll/queries";

export function PayrunDetailView({
  payrun,
  branches = [],
  readOnly = false,
  backHref = "/hr/payroll",
  bukucloudSyncStatus,
  integrationsEnabled = false,
  payoutsEnabled = false,
  payoutBatch = null,
}: {
  payrun: PayrunDetail;
  branches?: Array<{ id: string; name: string }>;
  readOnly?: boolean;
  backHref?: string;
  bukucloudSyncStatus?: BukucloudSyncStatus;
  integrationsEnabled?: boolean;
  payoutsEnabled?: boolean;
  payoutBatch?: {
    batch: {
      id: string;
      status: string;
      bank_format: string;
      submitted_at: string | null;
      reconciled_at: string | null;
    };
    items: Array<{
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
    }>;
  } | null;
}) {
  const periodLabel = `${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          label={payrun.status.replace("_", " ")}
          tone={payrun.status === "locked" ? "success" : "warning"}
        />
        <span className="text-sm text-muted-foreground">
          {payrun.scope === "pay_group" ? payrun.payGroupName ?? "Pay group" : "Organisation-wide"}
          {" · "}
          {payrun.payrunType}
        </span>
        {payrun.payDate ? (
          <span className="text-sm text-muted-foreground">Pay date {payrun.payDate}</span>
        ) : null}
        <Link className="text-sm text-[var(--accent-primary)]" href={backHref}>
          Back to payroll
        </Link>
      </div>

      {payrun.flaggedCount > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          {payrun.flaggedCount} employee line{payrun.flaggedCount === 1 ? "" : "s"} need resolution before
          approval (negative net pay).
        </div>
      ) : null}

      {readOnly ? null : (
        <div className="flex flex-wrap items-center gap-3">
          <PayrunWorkflowActions payrunId={payrun.id} status={payrun.status} />
          <DeletePayrunButton
            label="Delete payrun"
            payrunId={payrun.id}
            periodLabel={periodLabel}
            status={payrun.status}
          />
        </div>
      )}

      <PayrunTotalsSummary employeeCount={payrun.items.length} totals={payrun.totals} />

      {readOnly || payrun.items.length === 0 ? null : (
        <PayrunCalculatorCompare payrunId={payrun.id} />
      )}

      <PayrunLinesTable editable={!readOnly && payrun.status === "draft"} items={payrun.items} payrunId={payrun.id} />

      {readOnly ? null : <PayrunExportPanel branches={branches} payrunId={payrun.id} status={payrun.status} />}

      {readOnly || !bukucloudSyncStatus ? null : (
        <PayrunBukucloudPanel
          integrationsEnabled={integrationsEnabled}
          payrunId={payrun.id}
          status={payrun.status}
          syncStatus={bukucloudSyncStatus}
        />
      )}

      {readOnly || payrun.status !== "locked" ? null : (
        <PayrunPayoutPanel
          batch={payoutBatch?.batch ?? null}
          items={payoutBatch?.items ?? []}
          payoutsEnabled={payoutsEnabled}
          payrunId={payrun.id}
        />
      )}

      <p className="text-xs text-muted-foreground">
        Period {periodLabel} · {payrun.earningPeriodStart} → {payrun.earningPeriodEnd}
        {payrun.lockedAt ? ` · Locked ${new Date(payrun.lockedAt).toLocaleString()}` : ""}
      </p>
    </div>
  );
}
