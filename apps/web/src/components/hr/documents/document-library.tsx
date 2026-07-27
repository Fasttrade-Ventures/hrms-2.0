"use client";

import Link from "next/link";

import { DeleteDocumentButton } from "@/components/hr/documents/delete-document-button";
import { UploadDocumentDialog } from "@/components/hr/documents/upload-document-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HrDocumentRow } from "@/lib/hr/documents";

const GRID =
  "md:grid md:grid-cols-[minmax(140px,1fr)_minmax(120px,0.9fr)_minmax(140px,1fr)_minmax(100px,0.8fr)_96px_96px_120px] md:items-center md:gap-3";

export function DocumentLibrary({
  rows,
  employees,
  requiredTypes,
  folders,
  defaultEmployeeId,
}: {
  rows: HrDocumentRow[];
  employees: Array<{ id: string; full_name: string; employee_number: string }>;
  requiredTypes: Array<{ id: string; name: string; requiresExpiry: boolean }>;
  folders: Array<{ id: string; name: string; parentName: string | null }>;
  defaultEmployeeId?: string;
}) {
  return (
    <Card className="overflow-hidden py-0" size="sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
        <CardTitle className="text-sm">Document library</CardTitle>
        <UploadDocumentDialog
          defaultEmployeeId={defaultEmployeeId}
          employees={employees}
          folders={folders}
          requiredTypes={requiredTypes}
        />
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No documents match these filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className={`hidden px-3.5 py-2 text-xs font-medium text-muted-foreground ${GRID}`}>
              <span>Employee</span>
              <span>Type</span>
              <span>File</span>
              <span>Folder</span>
              <span>Expires</span>
              <span>Download</span>
              <span className="text-right">Actions</span>
            </div>
            {rows.map((row) => (
              <div className={`flex flex-col gap-3 px-3.5 py-3 ${GRID}`} key={row.id}>
                <div>
                  <p className="font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
                </div>
                <p className="text-sm">{row.documentType}</p>
                <p className="truncate text-sm">{row.fileName}</p>
                <p className="text-sm text-muted-foreground">{row.folderName ?? "—"}</p>
                <p className="text-sm">{row.expiresAt ?? "—"}</p>
                <div>
                  <Button render={<Link href={`/api/files/${row.fileId}/download`} />} size="sm" variant="outline">
                    Download
                  </Button>
                </div>
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <DeleteDocumentButton documentId={row.id} fileName={row.fileName} />
                  <Button render={<Link href={`/hr/employees/${row.employeeId}`} />} size="sm" variant="outline">
                    Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
