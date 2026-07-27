"use client";

import Link from "next/link";

import { StatusPill } from "@hrms/ui";

import { DeletePayrunButton } from "@/components/hr/payroll/delete-payrun-button";
import type { PayrunListItem } from "@/lib/payroll/queries";

export function PayrunListTable({ payruns }: { payruns: PayrunListItem[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
      <div className="border-b border-[var(--border-primary)] bg-[var(--surface-muted)] px-4 py-3">
        <p className="text-sm font-medium">Payruns ({payruns.length})</p>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-max">
          <div className="flex items-center gap-4 border-b border-[var(--border-primary)] bg-[var(--surface-muted)]/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--foreground-muted)]">
            <div className="w-28 shrink-0">Period</div>
            <div className="min-w-[200px] flex-1">Earning period</div>
            <div className="w-36 shrink-0">Scope</div>
            <div className="w-28 shrink-0">Status</div>
            <div className="w-32 shrink-0">Actions</div>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {payruns.map((payrun) => {
              const periodLabel = `${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`;
              return (
                <div key={payrun.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="w-28 shrink-0">
                    <Link className="font-medium text-[var(--accent-primary)]" href={`/hr/payroll/${payrun.id}`}>
                      {periodLabel}
                    </Link>
                  </div>
                  <div className="min-w-[200px] flex-1 text-sm text-[var(--foreground-secondary)]">
                    {payrun.earningPeriodStart} → {payrun.earningPeriodEnd}
                  </div>
                  <div className="w-36 shrink-0 text-sm text-[var(--foreground-secondary)]">
                    {payrun.scope === "pay_group" ? (payrun.payGroupName ?? "Pay group") : "Organisation"}
                  </div>
                  <div className="w-28 shrink-0">
                    <StatusPill
                      label={payrun.status.replace("_", " ")}
                      tone={payrun.status === "locked" ? "success" : "warning"}
                    />
                  </div>
                  <div className="flex w-32 shrink-0 items-center gap-2">
                    <Link className="text-sm text-[var(--accent-primary)]" href={`/hr/payroll/${payrun.id}`}>
                      Open
                    </Link>
                    {payrun.status !== "locked" ? (
                      <DeletePayrunButton payrunId={payrun.id} periodLabel={periodLabel} size="sm" status={payrun.status} />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
