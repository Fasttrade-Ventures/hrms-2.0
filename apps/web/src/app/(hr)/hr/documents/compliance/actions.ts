"use server";

import { logReportExport } from "@/lib/reports/audit";
import { requireRole } from "@/lib/auth/session";
import { buildComplianceMatrix, listRequiredDocuments } from "@/lib/hr/documents";
import { complianceMatrixToCsv } from "@/lib/hr/documents-export";
import { parseReportFilters } from "@/lib/reports/filters";

export async function exportComplianceMatrixCsv() {
  await requireRole("hr_administrator");
  const [rows, requiredTypes] = await Promise.all([
    buildComplianceMatrix(),
    listRequiredDocuments(true),
  ]);
  const filters = parseReportFilters({});
  await logReportExport({ slug: "document-compliance", format: "csv", filters });
  const csv = complianceMatrixToCsv(
    rows,
    requiredTypes.map((row) => row.name),
  );
  const date = new Date().toISOString().slice(0, 10);
  return { csv, filename: `document-compliance-${date}.csv` };
}
