import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { UploadDocumentForm } from "@/components/hr/upload-document-form";
import { PortalSectionCard } from "@/components/portal/portal-section";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listEmployeeDocuments } from "@/lib/hr/documents";
import { listActiveEmployeesForSelect } from "@/lib/employees/queries";
import { requireRole } from "@/lib/auth/session";

export default async function Page() {
  await requireRole("hr_administrator");
  const [documents, employees] = await Promise.all([
    listEmployeeDocuments().catch(() => []),
    listActiveEmployeesForSelect().catch(() => []),
  ]);

  return (
    <div className="space-y-8">
      <PortalPageHeader
        description="Upload and manage employee documents."
        title="Documents"
      />

      <PortalSectionCard description="Upload a file and attach it to an employee record." title="Upload document">
        <UploadDocumentForm employees={employees} />
      </PortalSectionCard>

      <ListCard
        columns={[
          { key: "employee", label: "Employee" },
          { key: "type", label: "Type" },
          { key: "file", label: "File" },
          { key: "expires", label: "Expires", className: "w-32" },
        ]}
        empty={<EmptyState description="Uploaded documents will appear here." title="No documents" />}
        header={<p className="text-sm font-medium">Employee documents</p>}
        rows={documents.map((doc) => ({
          id: doc.id,
          cells: {
            employee: doc.employeeName,
            type: doc.documentType,
            file: doc.fileName,
            expires: doc.expiresAt ? formatDate(doc.expiresAt) : "—",
          },
        }))}
      />
    </div>
  );
}
