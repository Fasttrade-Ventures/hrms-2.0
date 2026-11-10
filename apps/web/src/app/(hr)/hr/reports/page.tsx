import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportsHub } from "@/components/reports/reports-hub";
import { getOrganizationDisplay } from "@/lib/organization-display";

export default async function ReportsHubPage() {
  const { country } = await getOrganizationDisplay();
  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Operational reports, exports, and payroll statutory shortcuts."
        title="Reports"
      />
      <ReportsHub basePath="/hr/reports" country={country} portal="hr" />
    </div>
  );
}
