import { describe, expect, it } from "vitest";

import { money } from "../money";
import { detectSocsoCategory, lookupSocsoContribution } from "./socso";

describe("detectSocsoCategory", () => {
  it("returns cat1 for employee under 60", () => {
    expect(detectSocsoCategory("1990-01-01", "2026-07-01")).toBe("cat1");
  });

  it("returns cat2 for employee 60 and above", () => {
    expect(detectSocsoCategory("1960-01-01", "2026-07-01")).toBe("cat2");
  });
});

describe("lookupSocsoContribution", () => {
  it("caps wage at RM6000 for cat1", () => {
    const result = lookupSocsoContribution(money(7500), "cat1");
    expect(result.wageBand).toBe(6000);
    expect(result.employee.toNumber()).toBe(29.75);
    expect(result.employer.toNumber()).toBe(104.15);
  });

  it("returns RM4000 band contributions", () => {
    const result = lookupSocsoContribution(money(4000), "cat1");
    expect(result.wageBand).toBe(4000);
    expect(result.employee.toNumber()).toBe(19.75);
    expect(result.employer.toNumber()).toBe(69.15);
  });

  it("cat2 has employer-only contribution", () => {
    const result = lookupSocsoContribution(money(4000), "cat2");
    expect(result.employee.toNumber()).toBe(0);
    expect(result.employer.toNumber()).toBe(49.4);
  });
});
