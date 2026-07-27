import { requireReportRunnerAccess } from "@/lib/reports/access";

import { listAssetRegisterRows } from "./asset-register";
import { listAttendanceDailyRows } from "./attendance-daily";
import { listAttendanceSummaryRows } from "./attendance-summary";
import { listClaimsOtRows } from "./claims-ot";
import { listDocumentComplianceRows } from "./document-compliance";
import { listHeadcountRows } from "./headcount";
import { listLeaveBalanceRows } from "./leave-balances";
import { listLeaveUsageRows } from "./leave-usage";
import { listPerformanceSnapshotRows } from "./performance-snapshot";
import type { ReportFilters, ReportSlug } from "./types";

export type ReportResult = {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  total: number;
};

export async function runReport(slug: ReportSlug, filters: ReportFilters): Promise<ReportResult> {
  await requireReportRunnerAccess();

  switch (slug) {
    case "leave-balances":
      return listLeaveBalanceRows(filters);
    case "leave-usage":
      return listLeaveUsageRows(filters);
    case "attendance-daily":
      return listAttendanceDailyRows(filters);
    case "attendance-summary":
      return listAttendanceSummaryRows(filters);
    case "headcount": {
      const headcount = await listHeadcountRows(filters);
      return {
        columns: headcount.columns,
        rows: headcount.rows,
        total: headcount.total,
      };
    }
    case "document-compliance":
      return listDocumentComplianceRows(filters);
    case "asset-register":
      return listAssetRegisterRows(filters);
    case "claims-ot":
      return listClaimsOtRows(filters);
    case "performance-snapshot":
      return listPerformanceSnapshotRows(filters);
    default: {
      const _exhaustive: never = slug;
      throw new Error(`Unknown report: ${_exhaustive}`);
    }
  }
}

export async function runReportForExport(
  slug: ReportSlug,
  filters: ReportFilters,
): Promise<ReportResult> {
  const exportFilters = { ...filters, page: 1, pageSize: 5000 };
  return runReport(slug, exportFilters);
}
