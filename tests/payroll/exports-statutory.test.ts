import { describe, expect, it } from "vitest";

import {
  buildEpfFile,
  buildHrdfFile,
  buildPcbFile,
  buildSocsoFile,
} from "../../apps/web/src/lib/payroll/exports/statutory";
import {
  validateEpfFileContent,
  validateSocsoFileContent,
  validateStatutoryExportRows,
} from "../../apps/web/src/lib/payroll/exports/validate";

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
  it("builds EPF file with one record per employee", () => {
    const content = buildEpfFile([sampleRow], "EPF123456");
    expect(content.trim().split("\n")).toHaveLength(1);
    expect(content).toContain("EPF123456");
  });

  it("builds SOCSO and PCB files", () => {
    expect(buildSocsoFile([sampleRow], "A12345678", "2026-07").length).toBeGreaterThan(10);
    expect(buildPcbFile([sampleRow], "2026-07").length).toBeGreaterThan(10);
    expect(buildHrdfFile([sampleRow]).length).toBeGreaterThan(0);
  });

  it("validates employer registration numbers", () => {
    const epfErrors = validateEpfFileContent(buildEpfFile([sampleRow], "EPF123"), "EPF123");
    expect(epfErrors).toHaveLength(0);
    expect(validateEpfFileContent("x", "EMPLOYER").length).toBeGreaterThan(0);
    expect(validateSocsoFileContent(buildSocsoFile([sampleRow], "A123", "2026-07"), "A123")).toHaveLength(0);
    expect(validateStatutoryExportRows([sampleRow])).toHaveLength(0);
  });
});
