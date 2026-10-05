import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { TemplateBuilder } from "@/components/hr/performance/template-builder";
import { listDepartments } from "@/lib/hr/organization";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

export default async function CreateAppraisalTemplatePage() {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const departments = await listDepartments().catch(() => []);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="New Appraisal Template"
        description="Build a reusable evaluation template with custom sections, competency criteria, and rating scales."
      />

      <TemplateBuilder
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
