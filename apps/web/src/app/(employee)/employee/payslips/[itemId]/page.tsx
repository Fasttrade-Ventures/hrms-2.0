import Link from "next/link";
import { redirect } from "next/navigation";

import { StatCard } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getPayslip } from "@/lib/employee/payslips";
import { requireModule } from "@/lib/entitlements";
import { formatMoney } from "@/lib/money";

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  await requireModule("payroll");
  const { itemId } = await params;
  const payslip = await getPayslip(itemId);

  if (!payslip) {
    redirect(`/unauthorized?from=/employee/payslips/${itemId}`);
  }

  const showStatutory = payslip.country === "MY";
  const money = (amount: number) => formatMoney(amount, payslip.currency);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Link
            className="inline-flex h-11 items-center border border-[var(--border-primary)] px-5 text-sm font-medium hover:bg-[var(--surface-muted)]"
            href="/employee/payslips"
          >
            Back to payslips
          </Link>
        }
        description="Payslip summary from locked payroll."
        title={payslip.periodLabel}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross pay" value={money(payslip.grossPay)} />
        <StatCard label="Net pay" value={money(payslip.netPay)} />
        {showStatutory ? (
          <>
            <StatCard label="EPF (employee)" value={money(payslip.epfEmployee)} />
            <StatCard label="PCB" value={money(payslip.pcb)} />
          </>
        ) : null}
      </div>

      {showStatutory ? (
        <section className="grid gap-4 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-2">
          <div>
            <p className="text-[13px] text-[var(--foreground-muted)]">SOCSO (employee)</p>
            <p className="text-sm">{money(payslip.socsoEmployee)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[var(--foreground-muted)]">EIS (employee)</p>
            <p className="text-sm">{money(payslip.eisEmployee)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[var(--foreground-muted)]">EPF (employer)</p>
            <p className="text-sm">{money(payslip.epfEmployer)}</p>
          </div>
          <div>
            <p className="text-[13px] text-[var(--foreground-muted)]">SOCSO (employer)</p>
            <p className="text-sm">{money(payslip.socsoEmployer)}</p>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 border border-[var(--border-primary)] bg-[var(--surface-card)] p-6 md:grid-cols-3">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Earnings</h2>
          <ul className="space-y-2 text-sm">
            {payslip.components.earnings.map((row) => (
              <li key={row.code} className="flex justify-between gap-4">
                <span>{row.name}</span>
                <span className="tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Deductions</h2>
          <ul className="space-y-2 text-sm">
            {payslip.components.deductions.map((row) => (
              <li key={row.code} className="flex justify-between gap-4">
                <span>{row.name}</span>
                <span className="tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Employer contributions</h2>
          <ul className="space-y-2 text-sm">
            {payslip.components.employer.map((row) => (
              <li key={row.code} className="flex justify-between gap-4">
                <span>{row.name}</span>
                <span className="tabular-nums">{money(row.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
