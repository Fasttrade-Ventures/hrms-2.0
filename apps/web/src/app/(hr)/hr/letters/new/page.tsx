import Link from "next/link";

import { LetterTemplateForm } from "@/components/hr/letters/letter-template-form";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator", "organization_owner");

  return (
    <div className="space-y-8">
      <PortalPageHeader
        actions={
          <Link className="text-sm font-medium text-primary" href="/hr/letters">
            Back to letters
          </Link>
        }
        title="New letter template"
      />
      <LetterTemplateForm />
    </div>
  );
}
