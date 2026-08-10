import { TeamDocumentsView } from "@/components/manager/team-documents-view";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listTeamComplianceSummary, listTeamDocuments } from "@/lib/manager/documents";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("manager");
  const [documents, summary] = await Promise.all([
    listTeamDocuments().catch(() => []),
    listTeamComplianceSummary().catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        description="View-only access to your direct reports' documents and compliance status."
        title="Team Documents"
      />
      <TeamDocumentsView documents={documents} summary={summary} />
    </div>
  );
}
