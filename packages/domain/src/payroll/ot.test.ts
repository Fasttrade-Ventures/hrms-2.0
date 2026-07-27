import { describe, expect, it } from "vitest";

import { money } from "../money";
import { computeOtPay } from "./ot";
import { prorateMonthlySalary, unpaidLeaveDeduction, workingDaysInPeriod } from "./proration";

describe("computeOtPay", () => {
  it("uses EA formula on RM5200 basic", () => {
    expect(computeOtPay(2, 1.5, money(5200)).toNumber()).toBe(600);
  });
});

describe("proration", () => {
  it("counts weekdays in July 2026", () => {
    expect(workingDaysInPeriod("2026-07-01", "2026-07-31")).toBe(23);
  });

  it("prorates mid-month join", () => {
    const basic = money(3000);
    const prorated = prorateMonthlySalary(basic, 12, 23);
    expect(prorated.toNumber()).toBeCloseTo(1565.22, 1);
  });

  it("deducts unpaid leave by working days", () => {
    expect(unpaidLeaveDeduction(money(3000), 1, 23).toNumber()).toBeCloseTo(130.43, 1);
  });
});
