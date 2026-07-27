import { DocumentsHub } from "@/components/hr/documents/documents-hub";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getDocumentsHubStats } from "@/lib/hr/documents";
import { requireRole } from "@/lib/auth/session";

export default async function DocumentsHubPage() {
  await requireRole("hr_administrator");
  const stats = await getDocumentsHubStats();
  return (
    <div className="space-y-6">
      <PortalPageHeader description="Upload, organize, and track employee documents." title="Documents" />
      <DocumentsHub stats={stats} />
    </div>
  );
}
