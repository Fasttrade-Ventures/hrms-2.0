import { describe, expect, it } from "vitest";

import {
  buildReportPageHref,
  buildReportPaginationLinks,
  buildReportSearchParams,
  parseReportFilters,
} from "../../apps/web/src/lib/reports/filters";

describe("parseReportFilters", () => {
  it("defaults to this month with page size 10", () => {
    expect(parseReportFilters({}, "2026-07-15")).toEqual({
      preset: "this_month",
      from: "2026-07-01",
      to: "2026-07-31",
      asOf: "2026-07-15",
      employmentStatus: "all",
      page: 1,
      pageSize: 10,
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
      pageSize: 10,
    });
  });
});

describe("buildReportSearchParams", () => {
  const baseFilters = parseReportFilters(
    {
      preset: "custom",
      from: "2026-01-01",
      to: "2026-03-31",
      branch: "branch-1",
      cycle: "cycle-1",
      assetStatus: "assigned",
      assetCategory: "cat-1",
      page: "2",
    },
    "2026-07-15",
  );

  it("serializes report filters including asset and review cycle params", () => {
    const params = buildReportSearchParams(baseFilters);
    expect(params.get("preset")).toBe("custom");
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-03-31");
    expect(params.get("branch")).toBe("branch-1");
    expect(params.get("cycle")).toBe("cycle-1");
    expect(params.get("assetStatus")).toBe("assigned");
    expect(params.get("assetCategory")).toBe("cat-1");
    expect(params.get("page")).toBe("2");
  });

  it("builds page hrefs with overridden page", () => {
    expect(buildReportPageHref("/hr/reports", "leave-balances", baseFilters, 3)).toBe(
      "/hr/reports/leave-balances?preset=custom&from=2026-01-01&to=2026-03-31&asOf=2026-07-15&branch=branch-1&cycle=cycle-1&assetStatus=assigned&assetCategory=cat-1&page=3",
    );
  });
});

describe("buildReportPaginationLinks", () => {
  it("returns at most five page links centered on the current page", () => {
    const links = buildReportPaginationLinks(10, 5, (page) => `/reports?page=${page}`);
    expect(links).toEqual([
      { page: 3, href: "/reports?page=3" },
      { page: 4, href: "/reports?page=4" },
      { page: 5, href: "/reports?page=5" },
      { page: 6, href: "/reports?page=6" },
      { page: 7, href: "/reports?page=7" },
    ]);
  });
});
