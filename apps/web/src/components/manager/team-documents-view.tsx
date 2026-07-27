import Link from "next/link";

import { HrStatCards, HrTableCard } from "@/components/hr/hr-ui";
import { HrStatusBadge } from "@/components/hr/hr-ui.client";
import { Button } from "@/components/ui/button";
import type { TeamComplianceSummaryRow, TeamDocumentRow } from "@/lib/manager/documents";
import type { ComplianceStatus } from "@/lib/hr/document-compliance";

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

export function TeamDocumentsView({
  documents,
  summary,
}: {
  documents: TeamDocumentRow[];
  summary: TeamComplianceSummaryRow[];
}) {
  const totalMissing = summary.reduce((count, row) => count + row.missing, 0);
  const totalExpiring = summary.reduce((count, row) => count + row.expiring, 0);

  return (
    <div className="space-y-6">
      <HrStatCards
        items={[
          { label: "Team members", value: summary.length },
          { label: "Missing / expired", value: totalMissing },
          { label: "Expiring soon", value: totalExpiring },
        ]}
      />

      {summary.length > 0 ? (
        <HrTableCard>
          <div className="border-b px-4 py-3">
            <p className="text-sm font-medium">Compliance by team member</p>
          </div>
          <div className="divide-y divide-border">
            {summary.map((row) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={row.employeeId}>
                <div>
                  <p className="font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{row.employeeNumber}</p>
                </div>
                <div className="flex gap-2">
                  {row.missing > 0 ? (
                    <HrStatusBadge label={`${row.missing} missing`} variant="destructive" />
                  ) : null}
                  {row.expiring > 0 ? (
                    <HrStatusBadge label={`${row.expiring} expiring`} variant="outline" />
                  ) : null}
                  {row.missing === 0 && row.expiring === 0 ? (
                    <HrStatusBadge label="Compliant" variant="secondary" />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </HrTableCard>
      ) : null}

      <HrTableCard>
        <div className="border-b px-4 py-3">
          <p className="text-sm font-medium">Team documents ({documents.length})</p>
        </div>
        {documents.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Assign direct reports in HR to see their documents here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {documents.map((doc) => (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={doc.id}>
                <div className="min-w-0">
                  <p className="font-medium">{doc.documentType}</p>
                  <p className="text-sm text-muted-foreground">
                    {doc.employeeName} · {doc.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {doc.complianceStatus ? (
                    <HrStatusBadge
                      label={statusLabel(doc.complianceStatus)}
                      variant={statusVariant(doc.complianceStatus)}
                    />
                  ) : null}
                  <Button render={<Link href={`/api/files/${doc.fileId}/download`} />} size="sm" variant="outline">
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </HrTableCard>
    </div>
  );
}
