import Link from "next/link";

import { DocumentsHub } from "@/components/hr/documents/documents-hub";
import { PortalWorkspaceStrip } from "@/components/portal/portal-workspace-strip";
import { Button } from "@/components/ui/button";
import { requireModule } from "@/lib/entitlements";
import { getDocumentsHubStats } from "@/lib/hr/documents";
import { requireRoleOrPermission } from "@/lib/auth/session";

export default async function DocumentsHubPage() {
  await requireRoleOrPermission(["hr_administrator", "organization_owner"], ["document_custodian"]);
  await requireModule("documents");
  const stats = await getDocumentsHubStats();
  return (
    <div className="space-y-6">
      <PortalWorkspaceStrip
        actions={
          <Button render={<Link href="/hr/documents/library" />} size="sm">
            Open library
          </Button>
        }
        meta="Upload, organize, and track employee documents."
        title="Documents"
      />
      <DocumentsHub stats={stats} />
    </div>
  );
}
