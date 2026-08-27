"use server";

import { rowsToCsv } from "@hrms/domain";

import { requireBranchAdminContext } from "@/lib/branch-admin/context";
import { logReportExport } from "@/lib/reports/audit";
import { getReportCsvRows } from "@/lib/reports/export";
import type { ReportFilters, ReportSlug } from "@/lib/reports/types";

export async function exportBranchReportCsv(slug: ReportSlug, filters: ReportFilters) {
  const context = await requireBranchAdminContext();
  const scoped = { ...filters, branchId: context.branchId };
  const { headers, rows, filename } = await getReportCsvRows(slug, scoped);
  await logReportExport({ slug, format: "csv", filters: scoped });
  return { csv: rowsToCsv(headers, rows), filename };
}

export async function logBranchReportPrint(slug: ReportSlug, filters: ReportFilters) {
  const context = await requireBranchAdminContext();
  const scoped = { ...filters, branchId: context.branchId };
  await logReportExport({ slug, format: "print", filters: scoped });
}
