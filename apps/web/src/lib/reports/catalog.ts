import type { ReportSlug } from "./types";

export type ReportDefinition = {
  slug: ReportSlug;
  title: string;
  description: string;
  usesDateRange: boolean;
  usesAsOf: boolean;
};

export const REPORT_CATALOG: ReportDefinition[] = [
  {
    slug: "leave-balances",
    title: "Leave balances",
    description: "Entitlement, used, pending, and remaining days per employee and leave type.",
    usesDateRange: false,
    usesAsOf: true,
  },
  {
    slug: "leave-usage",
    title: "Leave usage",
    description: "Approved and pending leave requests in the selected date range.",
    usesDateRange: true,
    usesAsOf: false,
  },
  {
    slug: "attendance-daily",
    title: "Attendance daily log",
    description: "Clock in/out records per employee, date, and session.",
    usesDateRange: true,
    usesAsOf: false,
  },
  {
    slug: "attendance-summary",
    title: "Attendance summary",
    description: "Per-employee rollup of presence, absence, lateness, and hours.",
    usesDateRange: true,
    usesAsOf: false,
  },
  {
    slug: "headcount",
    title: "Headcount",
    description: "Workforce counts by branch, department, and employment status.",
    usesDateRange: false,
    usesAsOf: true,
  },
  {
    slug: "document-compliance",
    title: "Document compliance",
    description: "Required document status for every employee.",
    usesDateRange: false,
    usesAsOf: false,
  },
  {
    slug: "asset-register",
    title: "Asset register",
    description: "Full asset inventory with assignee, status, and location.",
    usesDateRange: false,
    usesAsOf: false,
  },
  {
    slug: "claims-ot",
    title: "Claims & overtime",
    description: "Claims and overtime requests in the selected date range.",
    usesDateRange: true,
    usesAsOf: false,
  },
  {
    slug: "performance-snapshot",
    title: "Performance snapshot",
    description: "Appraisal status and ratings for the current review cycle.",
    usesDateRange: false,
    usesAsOf: false,
  },
];

export function getReportDefinition(slug: ReportSlug): ReportDefinition | undefined {
  return REPORT_CATALOG.find((report) => report.slug === slug);
}
