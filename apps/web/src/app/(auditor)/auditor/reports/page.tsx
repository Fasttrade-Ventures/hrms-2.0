import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportsHub } from "@/components/reports/reports-hub";
import { getOrganizationDisplay } from "@/lib/organization-display";

export default async function AuditorReportsPage() {
  const { country } = await getOrganizationDisplay();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Operational reports and exports for compliance review."
        title="Reports"
      />
      <ReportsHub basePath="/auditor/reports" country={country} portal="auditor" />
    </div>
  );
}
