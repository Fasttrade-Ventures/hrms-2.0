"use server";

import { rowsToCsv } from "@hrms/domain";

import { logReportExport } from "@/lib/reports/audit";
import { getReportCsvRows } from "@/lib/reports/export";
import { requireReportsAccess } from "@/lib/reports/access";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

export async function exportReportCsv(slug: ReportSlug, filters: ReportFilters) {
  await requireReportsAccess();
  const { headers, rows, filename } = await getReportCsvRows(slug, filters);
  await logReportExport({ slug, format: "csv", filters });
  return { csv: rowsToCsv(headers, rows), filename };
}

export async function logReportPrint(slug: ReportSlug, filters: ReportFilters) {
  await requireReportsAccess();
  await logReportExport({ slug, format: "print", filters });
}
