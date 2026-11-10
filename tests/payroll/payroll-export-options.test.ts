import { describe, expect, it } from "vitest";

import {
  payrollEmptyDescription,
  payrollHubDescription,
  showAuPayFile,
  statutoryExportOptionsFor,
} from "@/lib/payroll/export-options";

const MALAYSIAN_LABELS = ["EPF", "SOCSO + EIS", "PCB", "HRDF"];

describe("statutory export options by country", () => {
  it("keeps EPF, SOCSO + EIS, PCB and HRDF for MY", () => {
    expect(statutoryExportOptionsFor("MY").map((option) => option.label)).toEqual(
      MALAYSIAN_LABELS,
    );
  });

  it("offers none of them for AU", () => {
    expect(statutoryExportOptionsFor("AU")).toEqual([]);
  });
});

describe("payroll hub wording by country", () => {
  it("keeps the Malaysian wording for MY", () => {
    expect(payrollHubDescription("MY")).toBe(
      "Malaysia payroll payruns with EPF, SOCSO, EIS, and PCB.",
    );
    expect(payrollEmptyDescription("MY")).toBe(
      "Generate a draft payrun to calculate statutory deductions for active employees.",
    );
  });

  it("names no Malaysian statutory for AU", () => {
    const text = `${payrollHubDescription("AU")} ${payrollEmptyDescription("AU")}`;
    for (const word of ["EPF", "SOCSO", "EIS", "PCB", "HRDF", "Malaysia", "statutory"]) {
      expect(text).not.toContain(word);
    }
  });
});

describe("Xero and MYOB pay file by country", () => {
  it("is shown for AU and hidden for MY", () => {
    expect(showAuPayFile("AU")).toBe(true);
    expect(showAuPayFile("MY")).toBe(false);
  });
});
