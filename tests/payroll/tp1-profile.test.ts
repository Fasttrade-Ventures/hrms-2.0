import { describe, expect, it } from "vitest";

import { money } from "@hrms/domain";

import { buildTp1InputFromEmployeeData } from "@/lib/payroll/tp1-profile";

describe("buildTp1InputFromEmployeeData", () => {
  it("maps married profile with two children into TP1 reliefs", () => {
    const result = buildTp1InputFromEmployeeData({
      taxProfile: {
        marital_status: "married",
        spouse_working: true,
        zakat_annual: 0,
        tp1_payload: { otherReliefs: 0 },
      },
      profile: null,
      dependents: [{ dependent_type: "child" }, { dependent_type: "child" }],
    });

    expect(result.childCount).toBe(2);
    expect(result.tp1.spouse.toNumber()).toBe(0);
    expect(result.tp1.children.toNumber()).toBe(4000);
  });
});
