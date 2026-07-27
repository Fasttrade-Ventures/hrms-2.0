import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { ReportsHub } from "@/components/reports/reports-hub";
import { requireRole } from "@/lib/auth/session";

export default async function DirectorReportsHubPage() {
  await requireRole("director");

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Read-only operational reports across the organization."
        title="Reports"
      />
      <ReportsHub basePath="/director/reports" portal="director" />
    </div>
  );
}
