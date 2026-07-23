import { EmptyState, ListCard } from "@hrms/ui";

import { formatDate } from "@/components/employee/employee-shared";
import { PortalPageHeader } from "@/components/portal/portal-primitives";
import { listMyDocuments } from "@/lib/employee/catalog";

export default async function Page() {
  const documents = await listMyDocuments();

  return (
    <div className="space-y-6">
      <PortalPageHeader description="Your HR documents and files." title="Documents" />

      <ListCard
        columns={[
          { key: "type", label: "Document" },
          { key: "expires", label: "Expires", className: "w-32" },
        ]}
        empty={<EmptyState description="Documents shared by HR will appear here." title="No documents" />}
        header={<p className="text-sm font-medium">My documents</p>}
        rows={documents.map((doc) => ({
          id: doc.id,
          cells: {
            type: doc.document_type,
            expires: doc.expires_at ? formatDate(doc.expires_at) : "—",
          },
        }))}
      />
    </div>
  );
}
