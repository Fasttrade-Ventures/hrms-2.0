import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceMatrixRow } from "@/lib/hr/documents";
import type { ComplianceStatus } from "@/lib/hr/document-compliance";

function statusVariant(status: ComplianceStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "valid":
      return "secondary";
    case "expiring":
      return "outline";
    case "missing":
    case "expired":
      return "destructive";
  }
}

function statusLabel(status: ComplianceStatus): string {
  switch (status) {
    case "valid":
      return "Valid";
    case "expiring":
      return "Expiring";
    case "missing":
      return "Missing";
    case "expired":
      return "Expired";
  }
}

function libraryHref(employeeId: string, documentType: string, status: ComplianceStatus): string {
  const params = new URLSearchParams();
  params.set("employeeId", employeeId);
  params.set("documentType", documentType);
  if (status === "expired") params.set("status", "expired");
  else if (status === "expiring") params.set("status", "expiring");
  return `/hr/documents/library?${params.toString()}`;
}

export function ComplianceMatrix({
  rows,
  requiredNames,
}: {
  rows: ComplianceMatrixRow[];
  requiredNames: string[];
}) {
  return (
    <Card className="overflow-hidden py-0" size="sm">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-sm">Compliance matrix</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[180px_repeat(auto-fit,minmax(120px,1fr))] gap-2 border-b px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>Employee</span>
            {requiredNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-sm text-muted-foreground">
              Add required document types to start tracking compliance.
            </div>
          ) : (
            rows.map((row) => (
              <div
                className="grid grid-cols-[180px_repeat(auto-fit,minmax(120px,1fr))] items-center gap-2 border-b px-4 py-3"
                key={row.employeeId}
              >
                <div>
                  <Link className="font-medium hover:text-primary hover:underline" href={`/hr/employees/${row.employeeId}`}>
                    {row.employeeName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
                </div>
                {row.cells.map((cell) => (
                  <Link
                    className="inline-flex w-fit transition-opacity hover:opacity-80"
                    href={libraryHref(row.employeeId, cell.requiredDocumentName, cell.status)}
                    key={cell.requiredDocumentId}
                    title={`View ${cell.requiredDocumentName} in library`}
                  >
                    <Badge variant={statusVariant(cell.status)}>{statusLabel(cell.status)}</Badge>
                  </Link>
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
