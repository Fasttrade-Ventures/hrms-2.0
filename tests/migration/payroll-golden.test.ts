import { describe, expect, it } from "vitest";

import { getPayrollGoldenCases } from "@hrms/testkit";
import {
  epfContributableWage,
  epfEmployee,
  epfEmployer,
  eisEmployee,
  eisEmployer,
  lookupSocsoContribution,
  money,
  pcbMtdFull,
} from "@hrms/domain";

const zeroTp1 = { spouse: money(0), children: money(0), other: money(0), zakatAnnual: money(0) };
const zeroYtd = { gross: money(0), epf: money(0), pcb: money(0) };

describe("payroll golden cases", () => {
  const { cases } = getPayrollGoldenCases();

  it.each(cases)("case $id", (testCase) => {
    const { inputs, expected } = testCase as unknown as {
      id: string;
      inputs: Record<string, number | boolean | string>;
      expected: Record<string, number>;
    };

    if (testCase.id === "epf-ceil-rm50-6955") {
      const wage = epfContributableWage(money(inputs.grossWage as number), "ceil_rm50");
      expect(wage.toNumber()).toBe(expected.epfContributableWage);
      expect(epfEmployee(wage, inputs.epfEmployeeRate as number).toNumber()).toBe(expected.epfEmployee);
      expect(epfEmployer(wage, inputs.epfEmployerRate as number).toNumber()).toBe(expected.epfEmployer);
    }

    if (testCase.id === "eis-4000-bracket") {
      expect(eisEmployee(money(inputs.statutoryWageBase as number), inputs.eisEligible as boolean).toNumber()).toBe(
        expected.eisEmployee,
      );
      expect(eisEmployer(money(inputs.statutoryWageBase as number), inputs.eisEligible as boolean).toNumber()).toBe(
        expected.eisEmployer,
      );
    }

    if (testCase.id === "socso-ceiling-6000") {
      const category = (inputs.socsoCategory as string) === "cat2" ? "cat2" : "cat1";
      const result = lookupSocsoContribution(money(inputs.statutoryWageBase as number), category);
      expect(result.wageBand).toBe(expected.wageBand);
      expect(result.employee.toNumber()).toBe(expected.socsoEmployee);
      expect(result.employer.toNumber()).toBe(expected.socsoEmployer);
    }

    if (testCase.id.startsWith("pcb-")) {
      const month = inputs.month as number;
      const asOf = `2026-${String(month).padStart(2, "0")}-15`;
      const pcb = pcbMtdFull({
        frequency: "monthly",
        periodGross: money(inputs.monthlyGross as number),
        periodEpf: money(inputs.monthlyEpf as number),
        tp1: zeroTp1,
        ytd: zeroYtd,
        asOf,
        ceil5Sen: false,
      });
      const tolerance = (expected.tolerance as number | undefined) ?? 0.02;
      expect(pcb.toNumber()).toBeCloseTo(expected.pcb as number, tolerance > 0.1 ? 0 : 1);
    }
  });
});
