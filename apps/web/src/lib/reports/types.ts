import type { DatePreset } from "@hrms/domain";

export const REPORT_SLUGS = [
  "leave-balances",
  "leave-usage",
  "attendance-daily",
  "attendance-summary",
  "headcount",
  "document-compliance",
  "asset-register",
  "claims-ot",
  "performance-snapshot",
] as const;

export type ReportSlug = (typeof REPORT_SLUGS)[number];

export type EmploymentStatusFilter = "all" | "active" | "inactive" | "on_leave";

export type ReportFilters = {
  preset: DatePreset;
  from: string;
  to: string;
  asOf: string;
  branchId?: string;
  departmentId?: string;
  employmentStatus: EmploymentStatusFilter;
  employeeQuery?: string;
  reviewCycleId?: string;
  assetStatus?: string;
  assetCategoryId?: string;
  page: number;
  pageSize: number;
};

export function isReportSlug(value: string): value is ReportSlug {
  return (REPORT_SLUGS as readonly string[]).includes(value);
}
