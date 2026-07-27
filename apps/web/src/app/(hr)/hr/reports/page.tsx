import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportsHub } from "@/components/reports/reports-hub";

export default async function ReportsHubPage() {
  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Operational reports, exports, and payroll statutory shortcuts."
        title="Reports"
      />
      <ReportsHub basePath="/hr/reports" portal="hr" />
    </div>
  );
}
