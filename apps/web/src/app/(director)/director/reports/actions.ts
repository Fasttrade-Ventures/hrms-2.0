"use server";

import { rowsToCsv } from "@hrms/domain";

import { requireRole } from "@/lib/auth/session";
import { logReportExport } from "@/lib/reports/audit";
import { getReportCsvRows } from "@/lib/reports/export";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

export async function exportDirectorReportCsv(slug: ReportSlug, filters: ReportFilters) {
  await requireRole("director");
  const { headers, rows, filename } = await getReportCsvRows(slug, filters);
  await logReportExport({ slug, format: "csv", filters });
  return { csv: rowsToCsv(headers, rows), filename };
}

export async function logDirectorReportPrint(slug: ReportSlug, filters: ReportFilters) {
  await requireRole("director");
  await logReportExport({ slug, format: "print", filters });
}
