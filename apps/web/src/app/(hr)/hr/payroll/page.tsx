import { EmptyState } from "@hrms/ui";

import { PayrunListTable } from "@/components/hr/payroll/payrun-list-table";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listPayruns } from "@/lib/payroll/queries";

export default async function Page() {
  requireModule("payroll");
  await requireRole("hr_administrator");
  const payruns = await listPayruns().catch(() => []);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>
        }
        description="Malaysia payroll payruns with EPF, SOCSO, EIS, and PCB."
        title="Payroll"
      />

      {payruns.length === 0 ? (
        <EmptyState
          action={
            <HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>
          }
          description="Generate a draft payrun to calculate statutory deductions for active employees."
          title="No payruns"
        />
      ) : (
        <PayrunListTable payruns={payruns} />
      )}
    </div>
  );
}
