import Link from "next/link";

import { EmptyState, ListCard, StatCard, StatusPill } from "@hrms/ui";

import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalSectionCard } from "@/components/portal/portal-section";
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

function statusTone(status: ComplianceStatus): "success" | "warning" | "danger" | "neutral" {
  switch (status) {
    case "valid":
      return "success";
    case "expiring":
      return "warning";
    case "missing":
    case "expired":
      return "danger";
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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={String(summary.length)} />
        <StatCard label="Missing / expired" value={String(totalMissing)} />
        <StatCard label="Expiring soon" value={String(totalExpiring)} />
      </div>

      {summary.length > 0 ? (
        <PortalSectionCard
          description="Compliance snapshot for each direct report."
          title="Compliance by team member"
        >
          <ul className="space-y-2">
            {summary.map((row) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--surface-muted)] px-3 py-2.5"
                key={row.employeeId}
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground-primary)]">
                    {row.employeeName}
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)]">{row.employeeNumber}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {row.missing > 0 ? (
                    <StatusPill label={`${row.missing} missing`} tone="danger" />
                  ) : null}
                  {row.expiring > 0 ? (
                    <StatusPill label={`${row.expiring} expiring`} tone="warning" />
                  ) : null}
                  {row.missing === 0 && row.expiring === 0 ? (
                    <StatusPill label="Compliant" tone="success" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </PortalSectionCard>
      ) : null}

      <ListCard
        columns={[
          { key: "document", label: "Document", className: "min-w-0 flex-1" },
          { key: "status", label: "Status", className: "w-28" },
          { key: "action", label: "", className: "w-28 text-right" },
        ]}
        empty={
          <EmptyState
            description="Assign direct reports in HR to see their documents here."
            icon={<PortalIcon name="documents" className="h-6 w-6" />}
            title="No team documents"
          />
        }
        header={<p className="text-sm font-medium">Team documents ({documents.length})</p>}
        rows={documents.map((doc) => ({
          id: doc.id,
          cells: {
            document: (
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold text-[var(--foreground-primary)]">{doc.documentType}</p>
                <p className="text-xs text-[var(--foreground-muted)]">
                  {doc.employeeName} · {doc.fileName}
                </p>
              </div>
            ),
            status: doc.complianceStatus ? (
              <StatusPill
                label={statusLabel(doc.complianceStatus)}
                tone={statusTone(doc.complianceStatus)}
              />
            ) : (
              "—"
            ),
            action: (
              <Button
                render={<Link href={`/api/files/${doc.fileId}/download`} />}
                size="sm"
                variant="outline"
              >
                Download
              </Button>
            ),
          },
        }))}
      />
    </div>
  );
}
