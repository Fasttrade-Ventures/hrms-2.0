import Link from "next/link";

import { EmptyState, ListCard } from "@hrms/ui";

import { formatCurrency } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listPayslips } from "@/lib/employee/payslips";

export default async function Page() {
  const payslips = await listPayslips();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="View payslips from locked payroll runs."
        title="Payslips"
      />

      <ListCard
        columns={[
          { key: "period", label: "Period" },
          { key: "gross", label: "Gross", className: "hidden md:block w-32" },
          { key: "net", label: "Net pay", className: "w-32" },
        ]}
        empty={
          <EmptyState
            description="Payslips appear here after HR locks a payroll run."
            title="No payslips yet"
          />
        }
        header={<p className="text-sm font-medium">Your payslips ({payslips.length})</p>}
        rows={payslips.map((payslip) => ({
          id: payslip.id,
          cells: {
            period: (
              <Link
                className="font-medium text-[var(--foreground-primary)] hover:text-[var(--accent-primary)]"
                href={`/employee/payslips/${payslip.id}`}
              >
                {payslip.periodLabel}
              </Link>
            ),
            gross: formatCurrency(payslip.grossPay),
            net: formatCurrency(payslip.netPay),
          },
          action: (
            <Link className="text-sm text-[var(--accent-primary)]" href={`/employee/payslips/${payslip.id}`}>
              View
            </Link>
          ),
        }))}
      />
    </div>
  );
}
