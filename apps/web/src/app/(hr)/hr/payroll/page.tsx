import Link from "next/link";

import { EmptyState, ListCard, StatusPill } from "@hrms/ui";

import { CreatePayrunForm } from "@/components/hr/create-payrun-form";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listPayruns } from "@/lib/hr/payroll";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  const payruns = await listPayruns().catch(() => []);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Malaysia payroll payruns with EPF and EIS calculations."
        title="Payroll"
      />

      <PortalSectionCard description="Calculates EPF and EIS for all active employees." title="Create draft payrun">
        <CreatePayrunForm />
      </PortalSectionCard>

      {payruns.length === 0 ? (
        <EmptyState description="Create a draft payrun to get started." title="No payruns" />
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
                <Link className="font-medium text-[var(--accent-primary)]" href={`/hr/payroll/${payrun.id}`}>
                  {payrun.periodYear}-{String(payrun.periodMonth).padStart(2, "0")}
                </Link>
              ),
              range: `${payrun.earningPeriodStart} → ${payrun.earningPeriodEnd}`,
              status: (
                <StatusPill
                  label={payrun.status}
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
