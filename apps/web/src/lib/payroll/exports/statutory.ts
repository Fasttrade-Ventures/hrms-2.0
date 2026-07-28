import type { StatutoryExportRow } from "./store";

function padRight(value: string, length: number): string {
  return value.length >= length ? value.slice(0, length) : value.padEnd(length, " ");
}

function padLeft(value: string, length: number, char = "0"): string {
  return value.length >= length ? value.slice(-length) : value.padStart(length, char);
}

function toPerkesoMonth(month: string): string {
  if (/^\d{6}$/.test(month)) return month;
  const [year, mon] = month.split("-");
  if (!year || !mon) return month;
  return `${mon}${year}`;
}

function cents(value: number, length: number): string {
  return padLeft(String(Math.round(value * 100)), length);
}

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
          row.epfNumber || row.icNumber.replace(/-/g, ""),
          row.icNumber.replace(/-/g, ""),
          row.employeeName,
          row.epfWageBase.toFixed(2),
          row.epfEmployee.toFixed(2),
          row.epfEmployer.toFixed(2),
        ].join("|"),
    )
    .join("\n");
}

/** PERKESO ASSIST 2.0 combined SOCSO+EIS fixed-width record (278 chars). */
export function buildSocsoFile(rows: StatutoryExportRow[], employerCode: string, month: string): string {
  const monthField = toPerkesoMonth(month);
  return rows
    .map((row) => {
      const ic = row.icNumber.replace(/-/g, "").slice(0, 12);
      return [
        padRight(employerCode, 12),
        padRight("", 20),
        padRight(ic, 12),
        padRight(row.employeeName.slice(0, 150), 150),
        padRight(monthField, 6),
        cents(row.socsoWageBase, 14),
        cents(row.socsoEmployer, 6),
        cents(row.socsoEmployee, 6),
        cents(row.eisEmployer, 6),
        cents(row.eisEmployee, 6),
        cents(0, 6),
        " ".repeat(14),
        " ".repeat(20),
      ].join("");
    })
    .join("\n");
}

export const PERKESO_ASSIST_RECORD_LENGTH = 278;

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
