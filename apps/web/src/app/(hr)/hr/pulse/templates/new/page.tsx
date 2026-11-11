import Link from "next/link";

import { SurveyTemplateBuilder } from "@/components/hr/pulse/survey-template-builder";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export default async function Page() {
  await requireRole("hr_administrator");
  await requireModule("performance");

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={
          <Button render={<Link href="/hr/pulse?tab=templates" />} variant="outline">
            Back
          </Button>
        }
        description="Add sections and questions. Opening a survey later freezes a copy of this template."
        title="New survey template"
      />
      <SurveyTemplateBuilder />
    </div>
  );
}
