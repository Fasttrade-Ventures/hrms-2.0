import { EmployeeDocumentsView } from "@/components/employee/employee-documents-view";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { getMyDocumentComplianceSummary, listMyDocuments } from "@/lib/employee/documents";

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { type } = await searchParams;
  const [documents, summary] = await Promise.all([
    listMyDocuments(),
    getMyDocumentComplianceSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Your HR documents and required uploads." title="Documents" />
      <EmployeeDocumentsView defaultType={type} documents={documents} summary={summary} />
    </div>
  );
}
