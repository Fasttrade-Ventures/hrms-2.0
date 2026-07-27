import { describe, expect, it } from "vitest";

import { parseReportFilters } from "../../apps/web/src/lib/reports/filters";

describe("parseReportFilters", () => {
  it("defaults to this month with page size 50", () => {
    expect(parseReportFilters({}, "2026-07-15")).toEqual({
      preset: "this_month",
      from: "2026-07-01",
      to: "2026-07-31",
      asOf: "2026-07-15",
      employmentStatus: "all",
      page: 1,
      pageSize: 50,
    });
  });

  it("parses custom date range and filters", () => {
    expect(
      parseReportFilters(
        {
          preset: "custom",
          from: "2026-01-01",
          to: "2026-03-31",
          branch: "branch-1",
          department: "dept-1",
          status: "active",
          q: "ali",
          page: "2",
        },
        "2026-07-15",
      ),
    ).toEqual({
      preset: "custom",
      from: "2026-01-01",
      to: "2026-03-31",
      asOf: "2026-07-15",
      branchId: "branch-1",
      departmentId: "dept-1",
      employmentStatus: "active",
      employeeQuery: "ali",
      page: 2,
      pageSize: 50,
    });
  });
});
