import Link from "next/link";
import { notFound } from "next/navigation";

import { LetterTemplateForm } from "@/components/hr/letters/letter-template-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { getLetterTemplate } from "@/lib/letters/templates";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("hr_administrator", "organization_owner");
  const { id } = await params;
  const template = await getLetterTemplate(id);
  if (!template) notFound();

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/letters">
            Back to letters
          </Link>
        }
        title={template.name}
      />
      <LetterTemplateForm key={template.updated_at} template={template} />
    </div>
  );
}
