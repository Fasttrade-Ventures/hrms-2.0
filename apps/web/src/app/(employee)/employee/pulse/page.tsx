import { EmployeePulseClient } from "@/components/employee/pulse/employee-pulse-client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireModule } from "@/lib/entitlements";
import { listOpenPulseSurveysForEmployee } from "@/lib/hr/pulse-survey-runs";

export default async function Page() {
  await requireModule("performance");
  const surveys = await listOpenPulseSurveysForEmployee();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="Answer once while a survey is open. Your name is not shown on the average."
        title="Pulse"
      />
      <EmployeePulseClient surveys={surveys} />
    </div>
  );
}
