import { notFound } from "next/navigation";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { TemplateBuilder } from "@/components/hr/performance/template-builder";
import { getAppraisalTemplateDetail } from "@/lib/hr/performance-templates";
import { listDepartments } from "@/lib/hr/organization";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function EditAppraisalTemplatePage({ params }: Props) {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const { templateId } = await params;
  const [template, departments] = await Promise.all([
    getAppraisalTemplateDetail(templateId).catch(() => null),
    listDepartments().catch(() => []),
  ]);

  if (!template) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={`Edit Template: ${template.name}`}
        description="Update evaluation criteria, question descriptions, and weighting."
      />

      <TemplateBuilder
        initialData={template}
        departments={departments.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  );
}
