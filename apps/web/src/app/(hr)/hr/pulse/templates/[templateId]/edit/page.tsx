import Link from "next/link";
import { notFound } from "next/navigation";

import { SurveyTemplateBuilder } from "@/components/hr/pulse/survey-template-builder";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { getPulseSurveyTemplateDetail } from "@/lib/hr/pulse-survey-templates";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function EditPulseTemplatePage({ params }: Props) {
  await requireRole("hr_administrator");
  await requireModule("performance");

  const { templateId } = await params;
  const template = await getPulseSurveyTemplateDetail(templateId).catch(() => null);
  if (!template) notFound();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Button render={<Link href="/hr/pulse?tab=templates" />} variant="outline">
            Back
          </Button>
        }
        description="Edits apply to new surveys only. Surveys already opened keep their frozen questions."
        title={`Edit · ${template.name}`}
      />
      <SurveyTemplateBuilder initialData={template} />
    </div>
  );
}
