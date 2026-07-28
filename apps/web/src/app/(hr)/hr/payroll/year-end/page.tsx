import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { YearEndPanel } from "@/components/hr/payroll/year-end-panel";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { listBranchesForSettings } from "@/lib/payroll/settings";

export default async function PayrollYearEndPage() {
  await requireModule("payroll");
  await requireRole("hr_administrator");
  const branches = await listBranchesForSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PortalPageHeader
        description="Generate CP8D CSV and bulk EA PDFs from YTD balances. Per-employee EA PDFs are available on each employee profile under Payroll → Tax (TP1/TP3)."
        title="Year-end"
      />
      <YearEndPanel branches={branches} />
    </div>
  );
}
