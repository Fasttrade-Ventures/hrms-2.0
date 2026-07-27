import { describe, expect, it } from "vitest";

import { money } from "../money";
import { computeEmployeePayrun } from "./payrun-pipeline";

const flags = { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true };

const baseInput = {
  lines: [{ code: "BASIC", amount: money(5000), flags }],
  dateOfBirth: "1990-05-01",
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

describe("computeEmployeePayrun", () => {
  it("computes statutory stack for basic salary", () => {
    const result = computeEmployeePayrun(baseInput);

    expect(result.gross.toNumber()).toBe(5000);
    expect(result.epfEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.socsoEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.pcb.toNumber()).toBeGreaterThanOrEqual(0);
    expect(result.net.lte(result.gross)).toBe(true);
  });

  it("deducts LINDUNG at phase-1 rate on SOCSO wage base", () => {
    const without = computeEmployeePayrun(baseInput);
    const withLindung = computeEmployeePayrun({ ...baseInput, lindungEnabled: true });

    expect(withLindung.lindungEmployee.toNumber()).toBe(38);
    expect(withLindung.net.toNumber()).toBe(without.net.toNumber() - 38);
  });

  it("deducts monthly zakat after statutory deductions", () => {
    const without = computeEmployeePayrun(baseInput);
    const withZakat = computeEmployeePayrun({ ...baseInput, zakatMonthly: money(100) });

    expect(withZakat.zakatDeduction.toNumber()).toBe(100);
    expect(withZakat.net.toNumber()).toBe(without.net.toNumber() - 100);
  });

  it("lowers PCB when child reliefs are applied", () => {
    const withoutChildren = computeEmployeePayrun(baseInput);
    const withChildren = computeEmployeePayrun({
      ...baseInput,
      lines: [{ code: "BASIC", amount: money(4000), flags }],
      tp1: { ...baseInput.tp1, children: money(4000) },
    });
    expect(withChildren.pcb.lt(withoutChildren.pcb)).toBe(true);
  });
});
