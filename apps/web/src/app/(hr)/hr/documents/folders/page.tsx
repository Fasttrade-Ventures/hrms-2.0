import { FolderManager } from "@/components/hr/documents/folder-manager";
import { HrLinkButton } from "@/components/hr/hr-ui.client";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { requireRole } from "@/lib/auth/session";
import { listDocumentFolders } from "@/lib/hr/document-folders";

export default async function DocumentFoldersPage() {
  await requireRole("hr_administrator");
  const folders = await listDocumentFolders();

  return (
    <div className="space-y-6">
      <PortalPageHeader
        actions={<HrLinkButton href="/hr/documents" variant="outline">Back to hub</HrLinkButton>}
        description="Organize documents with up to two folder levels and role-based visibility."
        title="Document folders"
      />
      <FolderManager folders={folders} />
    </div>
  );
}
