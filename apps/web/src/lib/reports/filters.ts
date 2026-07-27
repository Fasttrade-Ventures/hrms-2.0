import { resolveDatePreset, type DatePreset } from "@hrms/domain";

import type { EmploymentStatusFilter, ReportFilters } from "./types";

const DATE_PRESETS: DatePreset[] = ["this_month", "last_month", "this_quarter", "ytd", "custom"];
const EMPLOYMENT_STATUSES: EmploymentStatusFilter[] = ["all", "active", "inactive", "on_leave"];

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parsePreset(value: string | undefined): DatePreset {
  if (value && DATE_PRESETS.includes(value as DatePreset)) {
    return value as DatePreset;
  }
  return "this_month";
}

function parseEmploymentStatus(value: string | undefined): EmploymentStatusFilter {
  if (value && EMPLOYMENT_STATUSES.includes(value as EmploymentStatusFilter)) {
    return value as EmploymentStatusFilter;
  }
  return "all";
}

export function parseReportFilters(
  searchParams: Record<string, string | string[] | undefined>,
  referenceDate = todayIso(),
): ReportFilters {
  const preset = parsePreset(readParam(searchParams, "preset"));
  const presetRange = resolveDatePreset(preset, referenceDate);
  const from =
    preset === "custom" ? readParam(searchParams, "from") ?? presetRange.from : presetRange.from;
  const to = preset === "custom" ? readParam(searchParams, "to") ?? presetRange.to : presetRange.to;
  const page = Math.max(1, Number.parseInt(readParam(searchParams, "page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(readParam(searchParams, "pageSize") ?? "50", 10) || 50),
  );

  const branchId = readParam(searchParams, "branch");
  const departmentId = readParam(searchParams, "department");
  const employeeQuery = readParam(searchParams, "q")?.trim() || undefined;
  const reviewCycleId = readParam(searchParams, "cycle") || undefined;
  const assetStatus = readParam(searchParams, "assetStatus") || undefined;
  const assetCategoryId = readParam(searchParams, "assetCategory") || undefined;

  return {
    preset,
    from,
    to,
    asOf: readParam(searchParams, "asOf") ?? referenceDate,
    branchId: branchId || undefined,
    departmentId: departmentId || undefined,
    employmentStatus: parseEmploymentStatus(readParam(searchParams, "status")),
    employeeQuery,
    reviewCycleId,
    assetStatus,
    assetCategoryId,
    page,
    pageSize,
  };
}

export function buildReportSearchParams(filters: ReportFilters, page = filters.page): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.preset !== "this_month") params.set("preset", filters.preset);
  if (filters.preset === "custom") {
    params.set("from", filters.from);
    params.set("to", filters.to);
  }
  if (filters.asOf) params.set("asOf", filters.asOf);
  if (filters.branchId) params.set("branch", filters.branchId);
  if (filters.departmentId) params.set("department", filters.departmentId);
  if (filters.employmentStatus !== "all") params.set("status", filters.employmentStatus);
  if (filters.employeeQuery) params.set("q", filters.employeeQuery);
  if (filters.reviewCycleId) params.set("cycle", filters.reviewCycleId);
  if (filters.assetStatus) params.set("assetStatus", filters.assetStatus);
  if (filters.assetCategoryId) params.set("assetCategory", filters.assetCategoryId);
  if (filters.pageSize !== 50) params.set("pageSize", String(filters.pageSize));
  if (page > 1) params.set("page", String(page));
  return params;
}

export function buildReportPageHref(
  basePath: string,
  slug: string,
  filters: ReportFilters,
  page = filters.page,
): string {
  const params = buildReportSearchParams(filters, page);
  const qs = params.toString();
  return qs ? `${basePath}/${slug}?${qs}` : `${basePath}/${slug}`;
}

export function buildReportPaginationLinks(
  pageCount: number,
  currentPage: number,
  hrefForPage: (page: number) => string,
): Array<{ page: number; href: string }> {
  if (pageCount <= 0) return [];

  const visibleCount = Math.min(pageCount, 5);
  const start =
    pageCount <= 5 ? 1 : Math.min(Math.max(1, currentPage - 2), pageCount - visibleCount + 1);

  return Array.from({ length: visibleCount }, (_, index) => {
    const page = start + index;
    return { page, href: hrefForPage(page) };
  });
}
