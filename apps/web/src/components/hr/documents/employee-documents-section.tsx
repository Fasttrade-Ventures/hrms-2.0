import Link from "next/link";

import { DeleteDocumentButton } from "@/components/hr/documents/delete-document-button";
import { UploadDocumentDialog } from "@/components/hr/documents/upload-document-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrDocumentRow } from "@/lib/hr/documents";

export function EmployeeDocumentsSection({
  employeeId,
  employeeName,
  documents,
  employees,
  requiredTypes,
  folders,
}: {
  employeeId: string;
  employeeName: string;
  documents: HrDocumentRow[];
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  requiredTypes: Array<{ id: string; name: string; requiresExpiry: boolean }>;
  folders: Array<{ id: string; name: string; parentName: string | null }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Documents</p>
          <p className="text-sm text-muted-foreground">Files attached to {employeeName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href={`/hr/documents/library?employeeId=${employeeId}`} />} size="sm" variant="outline">
            Open in library
          </Button>
          <UploadDocumentDialog
            defaultEmployeeId={employeeId}
            employees={employees}
            folders={folders}
            requiredTypes={requiredTypes}
            triggerLabel="Upload"
          />
        </div>
      </div>

      <Card className="overflow-hidden py-0" size="sm">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">Employee documents</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">No documents uploaded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {documents.map((doc) => (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={doc.id}>
                  <div>
                    <p className="font-medium">{doc.documentType}</p>
                    <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button render={<Link href={`/api/files/${doc.fileId}/download`} />} size="sm" variant="outline">
                      Download
                    </Button>
                    <DeleteDocumentButton documentId={doc.id} fileName={doc.fileName} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
