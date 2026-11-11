import { describe, expect, it } from "vitest";

import {
  addToMonthSeries,
  countByKey,
  emptyMonthSeries,
  incrementNamedCount,
  sortedNamedCounts,
} from "@/lib/analytics/bucket";

describe("analytics bucketing helpers", () => {
  it("aggregates named counts", () => {
    const map = new Map();
    incrementNamedCount(map, "a", "Alpha");
    incrementNamedCount(map, "a", "Alpha");
    incrementNamedCount(map, "b", "Beta");
    expect(sortedNamedCounts(map)).toEqual([
      { id: "a", name: "Alpha", count: 2 },
      { id: "b", name: "Beta", count: 1 },
    ]);
  });

  it("builds and fills month series", () => {
    const series = emptyMonthSeries(["2026-10", "2026-11"], ["joiners", "leavers"]);
    addToMonthSeries(series, "2026-11", "joiners", 3);
    expect(series).toEqual([
      { month: "2026-10", joiners: 0, leavers: 0 },
      { month: "2026-11", joiners: 3, leavers: 0 },
    ]);
  });

  it("counts stages", () => {
    expect(countByKey(["offer", "offer", "hired"])).toEqual([
      { key: "offer", count: 2 },
      { key: "hired", count: 1 },
    ]);
  });
});
