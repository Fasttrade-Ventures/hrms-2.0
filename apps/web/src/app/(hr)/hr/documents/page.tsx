import { DocumentsHub } from "@/components/hr/documents/documents-hub";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getDocumentsHubStats } from "@/lib/hr/documents";
import { requireRoleOrPermission } from "@/lib/auth/session";

export default async function DocumentsHubPage() {
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["document_custodian"]);
  const stats = await getDocumentsHubStats();
  return (
    <div className="space-y-6">
      <PortalPageHeader description="Upload, organize, and track employee documents." title="Documents" />
      <DocumentsHub stats={stats} />
    </div>
  );
}
