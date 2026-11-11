import { OrganizationLetterContactsSection } from "@/components/hr/letters/organization-letter-contacts-section";
import { OrganizationLetterheadSection } from "@/components/hr/letters/organization-letterhead-section";
import { LetterTemplateList } from "@/components/hr/letters/letter-template-list";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { getOrganizationLetterheadFileId } from "@/lib/letters/letterhead";
import { getOrganizationLetterContacts } from "@/lib/letters/org-contacts";
import { listLetterTemplates } from "@/lib/letters/templates";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  await requireRole("hr_administrator", "organization_owner");
  const { type } = await searchParams;
  const typeFilter = type === "offer" || type === "employment_agreement" ? type : undefined;
  const organizationId = await requireOrganizationId();
  const [templates, letterheadFileId, contacts] = await Promise.all([
    listLetterTemplates({ type: typeFilter }),
    getOrganizationLetterheadFileId(organizationId),
    getOrganizationLetterContacts(organizationId),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Offer and employment agreement templates used by recruitment."
        title="Letters"
      />
      <OrganizationLetterheadSection letterheadFileId={letterheadFileId} />
      <OrganizationLetterContactsSection
        companyEmail={contacts.companyEmail}
        companyPhone={contacts.companyPhone}
      />
      <LetterTemplateList templates={templates} typeFilter={typeFilter} />
    </div>
  );
}
