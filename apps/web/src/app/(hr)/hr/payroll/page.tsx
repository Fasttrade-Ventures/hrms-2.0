import { EmptyState } from "@hrms/ui";

import { AuPayFileForm } from "@/components/hr/payroll/au-pay-file-form";
import { PayrunListTable } from "@/components/hr/payroll/payrun-list-table";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalListPage } from "@/components/portal/portal-list-page";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getOrganizationDisplay } from "@/lib/organization-display";
import {
  payrollEmptyDescription,
  payrollHubDescription,
  showAuPayFile,
} from "@/lib/payroll/export-options";
import { listPayruns } from "@/lib/payroll/queries";

export default async function Page() {
  const [, , payruns, { country }] = await Promise.all([
    requireModule("payroll"),
    requireRole("hr_administrator"),
    listPayruns().catch(() => []),
    getOrganizationDisplay(),
  ]);

  return (
    <PortalListPage
      actions={<HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>}
      description={payrollHubDescription(country)}
      title="Payroll"
    >
      {showAuPayFile(country) ? <AuPayFileForm /> : null}

      {payruns.length === 0 ? (
        <EmptyState
          action={
            <HrLinkButton href="/hr/payroll/new">Create payrun</HrLinkButton>
          }
          description={payrollEmptyDescription(country)}
          icon={<PortalIcon name="payroll" />}
          title="No payruns yet"
        />
      ) : (
        <PayrunListTable payruns={payruns} />
      )}
    </PortalListPage>
  );
}
