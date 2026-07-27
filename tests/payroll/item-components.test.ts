import { describe, expect, it } from "vitest";

import { computeEmployeePayrun, money } from "@hrms/domain";

import { buildPayrunItemComponentRows } from "@/lib/payroll/item-components";

describe("buildPayrunItemComponentRows", () => {
  it("includes earnings and statutory component rows", () => {
    const lines = [
      {
        code: "BASIC",
        amount: money(5000),
        flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true },
      },
    ];
    const result = computeEmployeePayrun({
      lines,
      dateOfBirth: "1990-01-01",
      asOf: "2026-07-31",
      eisEligible: true,
      epfEmployeeRate: 11,
      epfEmployerRate: 13,
      voluntaryEpfExtraRate: 0,
      frequency: "monthly",
      ytd: { gross: money(0), epf: money(0), pcb: money(0) },
      tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
      zakatMonthly: money(0),
      hrdfEnabled: false,
      hrdfRate: 0.01,
      lindungEnabled: false,
      lindungRate: 0.0075,
      lindungEmployerRate: 0,
    });

    const componentIdByCode = new Map(
      [
        "BASIC",
        "DED_EPF",
        "DED_SOCSO",
        "DED_EIS",
        "DED_PCB",
        "DED_LINDUNG",
        "DED_ZAKAT",
        "ER_EPF",
        "ER_SOCSO",
        "ER_EIS",
      ].map((code) => [code, `id-${code}`]),
    );

    const rows = buildPayrunItemComponentRows("item-1", "org-1", componentIdByCode, lines, result);

    expect(rows.some((row) => row.component_id === "id-BASIC" && row.amount === "5000.00")).toBe(true);
    expect(rows.some((row) => row.component_id === "id-DED_EPF")).toBe(true);
    expect(rows.some((row) => row.component_id === "id-ER_EPF")).toBe(true);
    expect(rows.every((row) => row.payrun_item_id === "item-1" && row.organization_id === "org-1")).toBe(true);
  });
});
