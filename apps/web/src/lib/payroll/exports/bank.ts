import type { BankExportRow } from "./store";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildBankCsv(rows: BankExportRow[]): string {
  const header = "Employee Name,IC,Bank Name,Account Number,Net Pay,Reference";
  const lines = rows
    .filter((row) => row.netPay > 0)
    .map((row) =>
      [
        csvEscape(row.employeeName),
        csvEscape(row.icNumber),
        csvEscape(row.bankName),
        csvEscape(row.bankAccountNumber),
        row.netPay.toFixed(2),
        csvEscape(`PAY-${row.periodLabel}-${row.employeeNumber}`),
      ].join(","),
    );
  return [header, ...lines].join("\n");
}

/** Maybank M2E bulk payment — beneficiary name, account, amount, reference. */
export function buildMaybankFile(rows: BankExportRow[]): string {
  return rows
    .filter((row) => row.netPay > 0)
    .map(
      (row) =>
        `${row.bankAccountNumber.padStart(12, "0")}|${row.employeeName.slice(0, 40)}|${row.netPay
          .toFixed(2)
          .replace(".", "")}|PAY${row.periodLabel.replace("-", "")}${row.employeeNumber}`,
    )
    .join("\n");
}

/** CIMB BizChannel — account, amount (cents), beneficiary, reference. */
export function buildCimbFile(rows: BankExportRow[]): string {
  return rows
    .filter((row) => row.netPay > 0)
    .map(
      (row) =>
        `${row.bankAccountNumber},${Math.round(row.netPay * 100)},${row.employeeName},PAY-${row.periodLabel}-${row.employeeNumber}`,
    )
    .join("\n");
}

export function mapBankRows(
  items: Awaited<ReturnType<typeof import("./store").loadPayrunBranchItems>>,
  periodLabel: string,
): BankExportRow[] {
  return items.map((item) => {
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const profile = Array.isArray(employee?.employee_profiles)
      ? employee?.employee_profiles[0]
      : employee?.employee_profiles;
    return {
      employeeName: employee?.full_name ?? "Employee",
      icNumber: profile?.ic_number ?? "",
      bankName: profile?.bank_name ?? "",
      bankAccountNumber: profile?.bank_account_number ?? "",
      netPay: Number(item.net_pay),
      employeeNumber: employee?.employee_number ?? "",
      periodLabel,
    };
  });
}
