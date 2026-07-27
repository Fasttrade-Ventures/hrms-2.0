import { describe, expect, it } from "vitest";

import { buildBankCsv } from "@/lib/payroll/exports/bank";
import { buildEpfFile } from "@/lib/payroll/exports/statutory";
import { aggregateOtPayByEmployee } from "@/lib/payroll/feeds/ot";
import { groupComponents } from "@/lib/payroll/item-detail";

describe("payroll feeds", () => {
  it("aggregates OT pay per employee", () => {
    const totals = aggregateOtPayByEmployee(
      [
        { employee_id: "e1", hours: 2, rate_type: "1.5" },
        { employee_id: "e1", hours: 1, rate_type: "2" },
      ],
      [{ employeeId: "e1", monthlyBasic: 3000 }],
    );

    expect(totals.get("e1")).toBeGreaterThan(0);
  });
});

describe("payroll exports", () => {
  it("bank CSV skips zero-net rows", () => {
    const csv = buildBankCsv([
      {
        employeeName: "Ali",
        icNumber: "900101011234",
        bankName: "Maybank",
        bankAccountNumber: "1234567890",
        netPay: 0,
        employeeNumber: "EMP001",
        periodLabel: "2026-07",
      },
      {
        employeeName: "Siti",
        icNumber: "900202021234",
        bankName: "CIMB",
        bankAccountNumber: "0987654321",
        netPay: 3500,
        employeeNumber: "EMP002",
        periodLabel: "2026-07",
      },
    ]);

    const lines = csv.split("\n").filter(Boolean);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("Siti");
  });

  it("epf export includes one line per employee in branch", () => {
    const content = buildEpfFile(
      [
        {
          employeeName: "Ali",
          icNumber: "900101011234",
          employeeNumber: "EMP001",
          epfNumber: "EPF001",
          socsoNumber: "",
          taxNumber: "",
          grossPay: 5000,
          epfEmployee: 550,
          epfEmployer: 650,
          socsoEmployee: 24.75,
          socsoEmployer: 86.65,
          eisEmployee: 7.9,
          eisEmployer: 7.9,
          pcb: 120,
          hrdfEmployer: 0,
          epfWageBase: 5000,
          socsoWageBase: 5000,
          pcbWageBase: 5000,
        },
        {
          employeeName: "Siti",
          icNumber: "900202021234",
          employeeNumber: "EMP002",
          epfNumber: "EPF002",
          socsoNumber: "",
          taxNumber: "",
          grossPay: 4000,
          epfEmployee: 440,
          epfEmployer: 520,
          socsoEmployee: 19.75,
          socsoEmployer: 69.15,
          eisEmployee: 7.9,
          eisEmployer: 7.9,
          pcb: 80,
          hrdfEmployer: 0,
          epfWageBase: 4000,
          socsoWageBase: 4000,
          pcbWageBase: 4000,
        },
        {
          employeeName: "Kumar",
          icNumber: "900303031234",
          employeeNumber: "EMP003",
          epfNumber: "EPF003",
          socsoNumber: "",
          taxNumber: "",
          grossPay: 6000,
          epfEmployee: 660,
          epfEmployer: 780,
          socsoEmployee: 29.75,
          socsoEmployer: 104.15,
          eisEmployee: 7.9,
          eisEmployer: 7.9,
          pcb: 200,
          hrdfEmployer: 0,
          epfWageBase: 6000,
          socsoWageBase: 6000,
          pcbWageBase: 6000,
        },
      ],
      "EMP123456",
    );

    expect(content.split("\n").filter(Boolean)).toHaveLength(3);
  });
});

describe("payslip component grouping", () => {
  it("groups earnings, deductions, and employer rows", () => {
    const grouped = groupComponents([
      { code: "BASIC", name: "Basic salary", componentType: "earning", amount: 5000 },
      { code: "DED_EPF", name: "EPF", componentType: "deduction", amount: 550 },
      { code: "ER_EPF", name: "EPF employer", componentType: "employer", amount: 650 },
    ]);

    expect(grouped.earnings).toHaveLength(1);
    expect(grouped.deductions).toHaveLength(1);
    expect(grouped.employer).toHaveLength(1);
  });
});
