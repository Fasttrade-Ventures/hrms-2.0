export type PayrollCountry = "MY" | "AU";

export const STATUTORY_EXPORT_OPTIONS = [
  { value: "epf", label: "EPF" },
  { value: "socso", label: "SOCSO + EIS" },
  { value: "pcb", label: "PCB" },
  { value: "hrdf", label: "HRDF" },
] as const;

/** Statutory export files offered on a pay run. Australian companies have none. */
export function statutoryExportOptionsFor(country: PayrollCountry) {
  return country === "MY" ? STATUTORY_EXPORT_OPTIONS : [];
}

/** Description line on the payroll hub. */
export function payrollHubDescription(country: PayrollCountry): string {
  return country === "MY"
    ? "Malaysia payroll payruns with EPF, SOCSO, EIS, and PCB."
    : "Payroll payruns for your Australian company.";
}

/** Empty-state text on the payroll hub. */
export function payrollEmptyDescription(country: PayrollCountry): string {
  return country === "MY"
    ? "Generate a draft payrun to calculate statutory deductions for active employees."
    : "Generate a draft payrun to calculate pay for active employees.";
}

const MY_BANK_EXPORT_OPTIONS = [
  { value: "bank_csv", label: "Bank CSV" },
  { value: "bank_maybank", label: "Maybank" },
  { value: "bank_cimb", label: "CIMB" },
] as const;

const GENERIC_BANK_EXPORT_OPTIONS = [{ value: "bank_csv", label: "Bank CSV" }] as const;

/** Maybank and CIMB files are Malaysian bank formats. Other countries get a generic CSV. */
export function bankExportOptionsFor(country: PayrollCountry) {
  return country === "MY" ? MY_BANK_EXPORT_OPTIONS : GENERIC_BANK_EXPORT_OPTIONS;
}

/** The Xero and MYOB pay file is offered to Australian companies only. */
export function showAuPayFile(country: PayrollCountry): boolean {
  return country === "AU";
}
