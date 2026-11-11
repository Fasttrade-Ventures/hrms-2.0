import { describe, expect, it } from "vitest";

import {
  parseAnalyticsFilters,
  parseAnalyticsPeriod,
  periodRange,
} from "@/lib/analytics/period";

describe("parseAnalyticsPeriod", () => {
  it("defaults unknown values to 6m", () => {
    expect(parseAnalyticsPeriod(undefined)).toBe("6m");
    expect(parseAnalyticsPeriod("nope")).toBe("6m");
  });

  it("accepts month, 6m, ytd", () => {
    expect(parseAnalyticsPeriod("month")).toBe("month");
    expect(parseAnalyticsPeriod("6m")).toBe("6m");
    expect(parseAnalyticsPeriod("ytd")).toBe("ytd");
  });
});

describe("periodRange", () => {
  const now = new Date("2026-11-15T08:00:00+08:00");

  it("returns the current calendar month for month", () => {
    const range = periodRange("month", now);
    expect(range.months).toEqual(["2026-11"]);
    expect(range.start.toISOString().slice(0, 10)).toBe("2026-11-01");
  });

  it("returns six months ending at current month for 6m", () => {
    const range = periodRange("6m", now);
    expect(range.months).toEqual(["2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"]);
  });

  it("returns Jan through current month for ytd", () => {
    const range = periodRange("ytd", now);
    expect(range.months[0]).toBe("2026-01");
    expect(range.months.at(-1)).toBe("2026-11");
    expect(range.months).toHaveLength(11);
  });
});

describe("parseAnalyticsFilters", () => {
  it("parses period and optional ids", () => {
    expect(
      parseAnalyticsFilters({
        period: "ytd",
        branchId: "11111111-1111-4111-8111-111111111111",
        departmentId: "",
      }),
    ).toEqual({
      period: "ytd",
      branchId: "11111111-1111-4111-8111-111111111111",
      departmentId: null,
    });
  });
});
