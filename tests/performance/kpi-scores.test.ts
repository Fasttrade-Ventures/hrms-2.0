import { describe, expect, it } from "vitest";

import { weightedKpiRating } from "@/lib/performance/kpi-scores";

describe("kpi scores", () => {
  it("returns the weighted average of the employee and manager scores", () => {
    const rating = weightedKpiRating([
      { name: "Revenue", weight: 70, employeeScore: 4, managerScore: 2 },
      { name: "Quality", weight: 30, employeeScore: 5, managerScore: 5 },
    ]);
    // Revenue mean 3 * 70 + Quality mean 5 * 30 = 210 + 150 = 360 / 100 = 3.6
    expect(rating).toBe(3.6);
  });

  it("waits until both sides have scored a KPI", () => {
    expect(
      weightedKpiRating([{ name: "Revenue", weight: 100, employeeScore: 4, managerScore: null }]),
    ).toBeNull();
  });
});
