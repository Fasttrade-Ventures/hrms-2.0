import { EmptyState } from "@hrms/ui";

import { PayrunListTable } from "@/components/hr/payroll/payrun-list-table";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getOrganizationDisplay } from "@/lib/organization-display";
import { payrollEmptyDescription, payrollHubDescription } from "@/lib/payroll/export-options";
import { listPayruns } from "@/lib/payroll/queries";

export default async function Page() {
  const [, , payruns, { country }] = await Promise.all([
    requireModule("payroll"),
    requireRole("hr_administrator"),
    listPayruns().catch(() => []),
    getOrganizationDisplay(),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>
        }
        description={payrollHubDescription(country)}
        title="Payroll"
      />

      {payruns.length === 0 ? (
        <EmptyState
          action={
            <HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>
          }
          description={payrollEmptyDescription(country)}
          title="No payruns"
        />
      ) : (
        <PayrunListTable payruns={payruns} />
      )}
    </div>
  );
}
