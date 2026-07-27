import { runReportForExport } from "./run";
import type { ReportFilters, ReportSlug } from "./types";

export async function getReportCsvRows(
  slug: ReportSlug,
  filters: ReportFilters,
): Promise<{ headers: string[]; rows: string[][]; filename: string }> {
  const result = await runReportForExport(slug, filters);
  const headers = result.columns.map((column) => column.label);
  const rows = result.rows.map((row) =>
    result.columns.map((column) => String(row[column.key] ?? "")),
  );
  const date = new Date().toISOString().slice(0, 10);
  return {
    headers,
    rows,
    filename: `${slug}-${date}.csv`,
  };
}
