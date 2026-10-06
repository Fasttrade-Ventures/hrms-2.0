import { describe, expect, it } from "vitest";

import { money } from "../money";
import { computeOtPay } from "./overtime";
import { prorateMonthlySalary, unpaidLeaveDeduction, workingDaysInPeriod } from "./proration";

describe("computeOtPay", () => {
  it("uses EA formula on RM5200 basic", () => {
    expect(computeOtPay(2, 1.5, money(5200)).toNumber()).toBe(600);
  });

  it("uses custom hourly rate override when provided", () => {
    // RM30/hour custom rate with 1.5x multiplier for 2 hours = 30 * 1.5 * 2 = 90
    expect(computeOtPay(2, 1.5, money(5200), 26, money(30)).toNumber()).toBe(90);
    // RM25/hour custom rate with 2.0x multiplier for 4 hours = 25 * 2 * 4 = 200
    expect(computeOtPay(4, 2.0, money(5200), 26, money(25)).toNumber()).toBe(200);
    // RM20/hour custom rate with 3.0x multiplier for 3 hours = 20 * 3 * 3 = 180
    expect(computeOtPay(3, 3.0, money(5200), 26, money(20)).toNumber()).toBe(180);
  });

  it("falls back to standard formula when override is null, undefined, or zero", () => {
    expect(computeOtPay(2, 1.5, money(5200), 26, null).toNumber()).toBe(600);
    expect(computeOtPay(2, 1.5, money(5200), 26, undefined).toNumber()).toBe(600);
    expect(computeOtPay(2, 1.5, money(5200), 26, money(0)).toNumber()).toBe(600);
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
