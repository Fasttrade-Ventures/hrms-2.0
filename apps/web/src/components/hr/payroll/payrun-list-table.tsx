"use client";

import Link from "next/link";

import { ListCard, StatusPill } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { DeletePayrunButton } from "@/components/hr/payroll/delete-payrun-button";
import type { PayrunListItem } from "@/lib/payroll/queries";

export function PayrunListTable({ payruns }: { payruns: PayrunListItem[] }) {
  return (
    <ListCard
      columns={[
        { key: "period", label: "Period", className: "w-28" },
        { key: "earning", label: "Earning period", className: "min-w-[200px]" },
        { key: "scope", label: "Scope", className: "w-36" },
        { key: "status", label: "Status", className: "w-28" },
        { key: "actions", label: "Actions", className: "w-32" },
      ]}
      header={<p className="text-sm font-medium">Payruns ({payruns.length})</p>}
      rows={payruns.map((payrun) => {
        const periodLabel = `${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`;
        return {
          id: payrun.id,
          cells: {
            period: (
              <Link className="font-medium text-[var(--accent-primary)]" href={`/hr/payroll/${payrun.id}`}>
                {periodLabel}
              </Link>
            ),
            earning: (
              <span>
                {formatDate(payrun.earningPeriodStart)} → {formatDate(payrun.earningPeriodEnd)}
              </span>
            ),
            scope: payrun.scope === "pay_group" ? (payrun.payGroupName ?? "Pay group") : "Organisation",
            status: (
              <StatusPill
                label={payrun.status.replace("_", " ")}
                tone={payrun.status === "locked" ? "success" : "warning"}
              />
            ),
            actions: (
              <span className="flex items-center gap-2">
                <Link className="text-sm text-[var(--accent-primary)]" href={`/hr/payroll/${payrun.id}`}>
                  Open
                </Link>
                {payrun.status !== "locked" ? (
                  <DeletePayrunButton payrunId={payrun.id} periodLabel={periodLabel} size="sm" status={payrun.status} />
                ) : null}
              </span>
            ),
          },
        };
      })}
    />
  );
}
