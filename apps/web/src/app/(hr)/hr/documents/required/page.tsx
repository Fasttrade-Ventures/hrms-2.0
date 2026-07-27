import { RequiredDocumentsManager } from "@/components/hr/documents/required-documents-manager";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { listRequiredDocuments } from "@/lib/hr/documents";

export default async function RequiredDocumentsPage() {
  await requireRole("hr_administrator");
  const rows = await listRequiredDocuments();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/documents" variant="outline">Back to hub</HrLinkButton>}
        description="Define mandatory document types used for uploads and compliance tracking."
        title="Required documents"
      />
      <RequiredDocumentsManager rows={rows} />
    </div>
  );
}
