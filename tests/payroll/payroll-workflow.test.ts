import { describe, expect, it } from "vitest";

import { computeEmployeePayrun, money } from "@hrms/domain";

const flags = { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true };

describe("payroll workflow calculations", () => {
  it("flags negative net pay for resolution", () => {
    const result = computeEmployeePayrun({
      lines: [{ code: "BASIC", amount: money(1000), flags }],
      dateOfBirth: "1990-01-01",
      asOf: "2026-07-31",
      eisEligible: true,
      epfEmployeeRate: 11,
      epfEmployerRate: 13,
      voluntaryEpfExtraRate: 0,
      frequency: "monthly",
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      zakatMonthly: money(2000),
      hrdfEnabled: false,
      hrdfRate: 0.01,
      lindungEnabled: false,
      lindungRate: 0.0075,
      lindungEmployerRate: 0,
    });

    expect(result.requiresResolution).toBe(true);
    expect(result.anomalyFlags).toContain("negative_net");
  });

  it("applies foreign worker EPF rates", () => {
    const base = {
      lines: [{ code: "BASIC", amount: money(6000), flags }],
      dateOfBirth: "1990-01-01",
      asOf: "2026-07-31",
      eisEligible: true,
      epfEmployeeRate: 11,
      epfEmployerRate: 13,
      voluntaryEpfExtraRate: 0,
      frequency: "monthly" as const,
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      zakatMonthly: money(0),
      hrdfEnabled: false,
      hrdfRate: 0.01,
      lindungEnabled: false,
      lindungRate: 0.0075,
      lindungEmployerRate: 0,
    };

    const local = computeEmployeePayrun({ ...base, isForeignWorker: false });
    const foreign = computeEmployeePayrun({ ...base, isForeignWorker: true });

    expect(foreign.epfEmployee.lt(local.epfEmployee)).toBe(true);
    expect(foreign.epfEmployer.toNumber()).toBe(780);
  });
});
