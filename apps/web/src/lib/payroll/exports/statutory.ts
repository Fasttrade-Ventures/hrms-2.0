import type { StatutoryExportRow } from "./store";

export function mapStatutoryRows(
  items: Awaited<ReturnType<typeof import("./store").loadPayrunBranchItems>>,
): StatutoryExportRow[] {
  return items.map((item) => {
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const profile = Array.isArray(employee?.employee_profiles)
      ? employee?.employee_profiles[0]
      : employee?.employee_profiles;
    return {
      employeeName: employee?.full_name ?? "Employee",
      icNumber: profile?.ic_number ?? "",
      employeeNumber: employee?.employee_number ?? "",
      epfNumber: profile?.epf_number ?? "",
      socsoNumber: profile?.socso_number ?? "",
      taxNumber: profile?.tax_number ?? "",
      grossPay: Number(item.gross_pay),
      epfEmployee: Number(item.epf_employee),
      epfEmployer: Number(item.epf_employer),
      socsoEmployee: Number(item.socso_employee),
      socsoEmployer: Number(item.socso_employer),
      eisEmployee: Number(item.eis_employee),
      eisEmployer: Number(item.eis_employer),
      pcb: Number(item.pcb),
      hrdfEmployer: Number(item.hrdf_employer),
      epfWageBase: Number(item.epf_wage_base),
      socsoWageBase: Number(item.socso_wage_base),
      pcbWageBase: Number(item.pcb_wage_base),
    };
  });
}

/** KWSP i-Akaun pipe-delimited contribution line per employee. */
export function buildEpfFile(rows: StatutoryExportRow[], employerEpfNumber: string): string {
  return rows
    .map(
      (row) =>
        [
          employerEpfNumber,
          row.epfNumber || row.icNumber,
          row.icNumber,
          row.employeeName,
          row.epfWageBase.toFixed(2),
          row.epfEmployee.toFixed(2),
          row.epfEmployer.toFixed(2),
        ].join("|"),
    )
    .join("\n");
}

/** PERKESO ASSIST combined SOCSO+EIS text format (simplified). */
export function buildSocsoFile(rows: StatutoryExportRow[], employerCode: string, month: string): string {
  return rows
    .map((row) =>
      [
        employerCode.padEnd(12),
        row.icNumber.padEnd(12),
        row.employeeName.slice(0, 40).padEnd(40),
        month.replace("-", ""),
        Math.round(row.socsoWageBase * 100)
          .toString()
          .padStart(14, "0"),
        Math.round(row.socsoEmployer * 100)
          .toString()
          .padStart(6, "0"),
        Math.round(row.socsoEmployee * 100)
          .toString()
          .padStart(6, "0"),
        Math.round(row.eisEmployer * 100)
          .toString()
          .padStart(6, "0"),
        Math.round(row.eisEmployee * 100)
          .toString()
          .padStart(6, "0"),
      ].join(""),
    )
    .join("\n");
}

/** LHDN PCB CP39 monthly deduction per employee. */
export function buildPcbFile(rows: StatutoryExportRow[], month: string): string {
  return rows
    .filter((row) => row.pcb > 0)
    .map((row) => [row.taxNumber || row.icNumber, row.employeeName, month, row.pcb.toFixed(2)].join(","))
    .join("\n");
}

/** HRDF levy per employee wage base. */
export function buildHrdfFile(rows: StatutoryExportRow[]): string {
  return rows
    .filter((row) => row.hrdfEmployer > 0)
    .map((row) => [row.employeeNumber, row.employeeName, row.epfWageBase.toFixed(2), row.hrdfEmployer.toFixed(2)].join(","))
    .join("\n");
}
