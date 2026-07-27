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
  pcbMtdComputerised,
} from "@hrms/domain";

describe("payroll golden cases", () => {
  const { cases } = getPayrollGoldenCases();

  it.each(cases)("case $id", (testCase) => {
    const { inputs, expected } = testCase as {
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
      const pcb = pcbMtdComputerised(
        money(inputs.monthlyGross as number),
        money(inputs.monthlyEpf as number),
        money(0),
        money(inputs.ytdGross as number),
        money(inputs.ytdEpf as number),
        money(inputs.ytdPcb as number),
        inputs.month as number,
      );
      const tolerance = (expected.tolerance as number | undefined) ?? 0.02;
      expect(pcb.toNumber()).toBeCloseTo(expected.pcb as number, tolerance > 0.1 ? 0 : 1);
    }
  });
});
