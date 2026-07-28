import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listPayruns } from "@/lib/payroll/queries";

export default async function DirectorPayrollPage() {
  await requireModule("payroll");
  await requireRole("director");
  const payruns = await listPayruns().catch(() => []);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Read-only view of payroll payruns and totals."
        title="Payroll"
      />

      {payruns.length === 0 ? (
        <EmptyState description="No payruns available yet." title="No payruns" />
      ) : (
        <ListCard
          columns={[
            { key: "period", label: "Period" },
            { key: "range", label: "Earning period" },
            { key: "status", label: "Status", className: "w-28" },
          ]}
          header={<p className="text-sm font-medium">Payruns ({payruns.length})</p>}
          rows={payruns.map((payrun) => ({
            id: payrun.id,
            cells: {
              period: (
                <Link className="font-medium text-[var(--accent-primary)]" href={`/director/payroll/${payrun.id}`}>
                  {payrun.periodYear}-{String(payrun.periodMonth).padStart(2, "0")}
                </Link>
              ),
              range: `${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`,
              status: (
                <StatusPill
                  label={payrun.status.replace("_", " ")}
                  tone={payrun.status === "locked" ? "success" : "warning"}
                />
              ),
            },
          }))}
        />
      )}
    </div>
  );
}
