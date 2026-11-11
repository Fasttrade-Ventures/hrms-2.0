import { PulseRegister } from "@/components/hr/pulse/pulse-register";
import { requireRole } from "@/lib/auth/session";
import { getPublicOrigin } from "@/lib/auth/routes";
import { requireModule } from "@/lib/entitlements";
import { listBranchOptions, listDepartments } from "@/lib/hr/organization";
import { listPulseSurveyRuns } from "@/lib/hr/pulse-survey-runs";
import { listPulseSurveyTemplates } from "@/lib/hr/pulse-survey-templates";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const { tab: tabParam } = await searchParams;
  const tab = tabParam === "templates" ? "templates" : "surveys";

  const [templates, runs, branches, departments] = await Promise.all([
    listPulseSurveyTemplates(),
    listPulseSurveyRuns(),
    listBranchOptions().catch(() => []),
    listDepartments().catch(() => []),
  ]);

  const departmentOptions = departments.map((row) => ({ id: row.id, name: row.name }));

  return (
    <PulseRegister
      branches={branches}
      departments={departmentOptions}
      runs={runs}
      siteOrigin={getPublicOrigin()}
      tab={tab}
      templates={templates}
    />
  );
}
