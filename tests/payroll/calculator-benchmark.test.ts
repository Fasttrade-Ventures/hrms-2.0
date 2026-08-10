import { describe, expect, it } from "vitest";

import { computeEmployeePayrun, computeTp1AnnualReliefs, money } from "@hrms/domain";
import { getCalculatorBenchmarks } from "@hrms/testkit";

const flags = { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true };
const { scenarios } = getCalculatorBenchmarks();

function runScenario(scenario: (typeof scenarios)[number]) {
  const reliefs = computeTp1AnnualReliefs({
    maritalStatus: scenario.inputs.maritalCategory === "married" ? "married" : "single",
    spouseWorking: scenario.inputs.spouseWorking ?? null,
    childCount: scenario.inputs.childCount,
  });

  return computeEmployeePayrun({
    lines: [{ code: "BASIC", amount: money(scenario.inputs.gross), flags }],
    dateOfBirth: scenario.inputs.dateOfBirth,
    asOf: "2026-06-30",
    eisEligible: true,
    epfEmployeeRate: scenario.inputs.epfEmployeeRate,
    epfEmployerRate: scenario.inputs.epfEmployerRate,
    voluntaryEpfExtraRate: 0,
    frequency: "monthly",
    ytd: { gross: money(0), epf: money(0), pcb: money(0) },
    tp1: {
      zakatAnnual: money(0),
      spouse: reliefs.spouse,
      children: reliefs.children,
      other: money(0),
    },
    zakatMonthly: money(0),
    hrdfEnabled: false,
    hrdfRate: 0.01,
    lindungEnabled: false,
    lindungRate: 0.0075,
    lindungEmployerRate: 0,
    maritalCategory: scenario.inputs.maritalCategory === "married" ? "married" : "single",
  });
}

describe("calculator benchmarks (HRMS authority)", () => {
  it.each(scenarios)("$id matches HRMS expected statutory stack", (scenario) => {
    const result = runScenario(scenario);
    const expected = scenario.hrmsExpected;

    if (expected.epfEmployee != null) {
      expect(result.epfEmployee.toNumber()).toBe(expected.epfEmployee);
    }
    if (expected.epfEmployer != null) {
      expect(result.epfEmployer.toNumber()).toBe(expected.epfEmployer);
    }
    if (expected.socsoEmployee != null) {
      expect(result.socsoEmployee.toNumber()).toBe(expected.socsoEmployee);
    }
    if (expected.socsoEmployer != null) {
      expect(result.socsoEmployer.toNumber()).toBe(expected.socsoEmployer);
    }
    if (expected.eisEmployee != null) {
      expect(result.eisEmployee.toNumber()).toBe(expected.eisEmployee);
    }
    if (expected.pcb != null) {
      expect(result.pcb.toNumber()).toBe(expected.pcb);
    }
    if (expected.pcbTolerance != null) {
      expect(result.pcb.toNumber()).toBeGreaterThan(0);
    }
    if (expected.netPay != null) {
      expect(result.net.toNumber()).toBeCloseTo(expected.netPay, 2);
    }
  });
});
