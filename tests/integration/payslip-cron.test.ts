import { describe, expect, it, vi } from "vitest";

import { generatePayslipPdf } from "../../apps/web/src/lib/payroll/pdf";

describe("generatePayslipPdf", () => {
  it("generates a valid basic PDF string buffer containing payslip details", () => {
    const pdfBuffer = generatePayslipPdf({
      employeeName: "John Doe",
      employeeNumber: "EMP-001",
      periodLabel: "August 2026",
      grossPay: 5000,
      netPay: 4200,
      epfEmployee: 550,
      epfEmployer: 650,
      socsoEmployee: 24,
      socsoEmployer: 85,
      eisEmployee: 7.9,
      eisEmployer: 7.9,
      pcb: 150,
    });

    expect(pdfBuffer).toBeInstanceOf(Uint8Array);
    expect(pdfBuffer.length).toBeGreaterThan(0);

    const pdfStr = new TextDecoder().decode(pdfBuffer);
    expect(pdfStr).toContain("%PDF-1.4");
    expect(pdfStr).toContain("John Doe");
    expect(pdfStr).toContain("EMP-001");
    expect(pdfStr).toContain("August 2026");
    expect(pdfStr).toContain("RM 5000.00");
    expect(pdfStr).toContain("RM 4200.00");
    expect(pdfStr).toContain("%%EOF");
  });
});
