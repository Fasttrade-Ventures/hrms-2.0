import Link from "next/link";
import { notFound } from "next/navigation";

import { ListCard, StatusPill } from "@hrms/ui";

import { LockPayrunButton } from "@/components/hr/lock-payrun-button";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getPayrunDetail } from "@/lib/hr/payroll";
import { requireRole } from "@/lib/auth/session";

export default async function PayrunDetailPage({
  params,
}: {
  params: Promise<{ payrunId: string }>;
}) {
  await requireRole("hr_administrator");
  const { payrunId } = await params;
  const payrun = await getPayrunDetail(payrunId);

  if (!payrun) notFound();

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description={`${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`}
        title={`Payrun ${payrun.periodYear}-${String(payrun.periodMonth).padStart(2, "0")}`}
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusPill
          label={payrun.status}
          tone={payrun.status === "locked" ? "success" : "warning"}
        />
        <Link className="text-sm text-[var(--accent-primary)]" href="/hr/payroll">
          Back to payroll
        </Link>
      </div>

      {payrun.status !== "locked" ? <LockPayrunButton payrunId={payrun.id} /> : null}

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "gross", label: "Gross", className: "w-28" },
          { key: "epf", label: "EPF", className: "w-24" },
          { key: "eis", label: "EIS", className: "w-24" },
          { key: "net", label: "Net", className: "w-28" },
        ]}
        header={<p className="text-sm font-medium">Employee lines</p>}
        rows={payrun.items.map((item) => ({
          id: item.id,
          cells: {
            employee: `${item.employeeNumber} · ${item.employeeName}`,
            gross: `RM ${item.grossPay}`,
            epf: `RM ${item.epfEmployee}`,
            eis: `RM ${item.eisEmployee}`,
            net: `RM ${item.netPay}`,
          },
        }))}
      />
    </div>
  );
}
