import { describe, expect, it } from "vitest";

import {
  buildEpfFile,
  buildHrdfFile,
  buildPcbFile,
  buildSocsoFile,
  PERKESO_ASSIST_RECORD_LENGTH,
} from "../../apps/web/src/lib/payroll/exports/statutory";
import {
  validateEpfFileContent,
  validateKwspLineLayout,
  validateSocsoFileContent,
  validateStatutoryExportRows,
} from "../../apps/web/src/lib/payroll/exports/validate";
import { getExportFixtures } from "@hrms/testkit";

const sampleRow = {
  employeeName: "Ali Ahmad",
  icNumber: "900101-01-1234",
  employeeNumber: "EMP-001",
  epfNumber: "12345678",
  socsoNumber: "SOCSO1",
  taxNumber: "TG123",
  grossPay: 4000,
  epfEmployee: 440,
  epfEmployer: 520,
  socsoEmployee: 19.75,
  socsoEmployer: 69.15,
  eisEmployee: 7.9,
  eisEmployer: 7.9,
  pcb: 16.75,
  hrdfEmployer: 40,
  epfWageBase: 4000,
  socsoWageBase: 4000,
  pcbWageBase: 4000,
};

describe("statutory export builders", () => {
  const fixtures = getExportFixtures();

  it("builds KWSP pipe file matching fixture layout", () => {
    const kwsp = fixtures.kwsp;
    const content = buildEpfFile([{ ...sampleRow, ...kwsp.row }], kwsp.employerEpfNumber);
    const line = content.trim();
    expect(line).toBe(kwsp.expectedLine);
    expect(validateKwspLineLayout(line, kwsp.fieldCount)).toHaveLength(0);
    expect(validateEpfFileContent(content, kwsp.employerEpfNumber)).toHaveLength(0);
  });

  it("builds PERKESO ASSIST v2 fixed-width records", () => {
    const perkeso = fixtures.perkeso;
    const row = { ...sampleRow, ...perkeso.row };
    const content = buildSocsoFile([row], perkeso.employerCode, "2026-07");
    const line = content.split("\n")[0] ?? "";
    expect(line.length).toBe(PERKESO_ASSIST_RECORD_LENGTH);
    expect(line.length).toBe(perkeso.recordLength);
    expect(line.slice(perkeso.fields.employerCode.start - 1, perkeso.fields.employerCode.end)).toBe(
      perkeso.employerCode.padEnd(12),
    );
    expect(line.slice(perkeso.fields.month.start - 1, perkeso.fields.month.end)).toBe(perkeso.month);
    expect(validateSocsoFileContent(content, perkeso.employerCode)).toHaveLength(0);
  });

  it("builds SOCSO and PCB files", () => {
    expect(buildPcbFile([sampleRow], "2026-07").length).toBeGreaterThan(10);
    expect(buildHrdfFile([sampleRow]).length).toBeGreaterThan(0);
  });

  it("validates employer registration numbers", () => {
    const epfErrors = validateEpfFileContent(buildEpfFile([sampleRow], "EPF123"), "EPF123");
    expect(epfErrors).toHaveLength(0);
    expect(validateEpfFileContent("x", "EMPLOYER").length).toBeGreaterThan(0);
    expect(validateStatutoryExportRows([sampleRow])).toHaveLength(0);
  });
});
