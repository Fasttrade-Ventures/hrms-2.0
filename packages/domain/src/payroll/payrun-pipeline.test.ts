import { describe, expect, it } from "vitest";

import { money, roundRinggit } from "../money";
import { computeEmployeePayrun, isMalaysia } from "./payrun-pipeline";

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

function expectedNetWithPcb(
  result: ReturnType<typeof computeEmployeePayrun>,
  pcb: ReturnType<typeof money>,
) {
  const baseDeductions = result.epfEmployee
    .add(result.socsoEmployee)
    .add(result.eisEmployee)
    .add(result.lindungEmployee)
    .add(result.zakatDeduction);
  return roundRinggit(result.gross.sub(baseDeductions.add(pcb)));
}

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

  it("uses pcbManualAmount instead of auto PCB when set", () => {
    const auto = computeEmployeePayrun(baseInput);
    const manual = computeEmployeePayrun({
      ...baseInput,
      pcbManualAmount: money(350),
    });

    expect(auto.pcb.toNumber()).not.toBe(350);
    expect(manual.pcb.toNumber()).toBe(350);
    expect(manual.pcbAuto.toNumber()).toBe(auto.pcb.toNumber());
    expect(manual.gross.toNumber()).toBe(auto.gross.toNumber());
    expect(manual.net.toNumber()).toBe(expectedNetWithPcb(manual, money(350)).toNumber());
  });

  it("allows pcbManualAmount of zero", () => {
    const manual = computeEmployeePayrun({
      ...baseInput,
      pcbManualAmount: money(0),
    });

    expect(manual.pcb.toNumber()).toBe(0);
    expect(manual.net.toNumber()).toBe(expectedNetWithPcb(manual, money(0)).toNumber());
  });

  it("falls back to auto PCB when pcbManualAmount is null or omitted", () => {
    const omitted = computeEmployeePayrun(baseInput);
    const explicitNull = computeEmployeePayrun({
      ...baseInput,
      pcbManualAmount: null,
    });

    expect(explicitNull.pcb.toNumber()).toBe(omitted.pcb.toNumber());
  });

  it("skips Malaysian statutory when the organization country is AU", () => {
    const result = computeEmployeePayrun({ ...baseInput, country: "AU" });
    expect(result.epfEmployee.toNumber()).toBe(0);
    expect(result.epfEmployer.toNumber()).toBe(0);
    expect(result.socsoEmployee.toNumber()).toBe(0);
    expect(result.socsoEmployer.toNumber()).toBe(0);
    expect(result.eisEmployee.toNumber()).toBe(0);
    expect(result.eisEmployer.toNumber()).toBe(0);
    expect(result.pcb.toNumber()).toBe(0);
    expect(result.pcbAuto.toNumber()).toBe(0);
    expect(result.hrdfEmployer.toNumber()).toBe(0);
    expect(result.gross.toNumber()).toBe(5000);
  });

  it("treats an omitted country as MY", () => {
    const result = computeEmployeePayrun({ ...baseInput, country: "MY" });
    expect(result.epfEmployee.toNumber()).toBeGreaterThan(0);
    expect(result.socsoEmployee.toNumber()).toBeGreaterThan(0);
  });
});

describe("isMalaysia", () => {
  it("is true only for MY", () => {
    expect(isMalaysia("MY")).toBe(true);
    expect(isMalaysia("AU")).toBe(false);
    expect(isMalaysia("SG")).toBe(false);
    expect(isMalaysia("")).toBe(false);
  });
});
