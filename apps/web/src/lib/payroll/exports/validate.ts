import type { StatutoryExportRow } from "@/lib/payroll/exports/store";
import { PERKESO_ASSIST_RECORD_LENGTH } from "@/lib/payroll/exports/statutory";

const IC_PATTERN = /^\d{6}-\d{2}-\d{4}$|^\d{12}$/;

export function validateStatutoryExportRows(rows: StatutoryExportRow[]): string[] {
  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("No employees in export.");
  }
  for (const row of rows) {
    if (!row.employeeName.trim()) errors.push(`Missing employee name for ${row.employeeNumber}.`);
    if (row.icNumber && !IC_PATTERN.test(row.icNumber.replace(/\s/g, ""))) {
      errors.push(`Invalid IC format for ${row.employeeName}.`);
    }
    if (row.grossPay < 0) errors.push(`Negative gross for ${row.employeeName}.`);
  }
  return errors;
}

export function validateEpfFileContent(content: string, employerNumber: string): string[] {
  const errors: string[] = [];
  if (!employerNumber.trim() || employerNumber === "EMPLOYER") {
    errors.push("Employer EPF number is required.");
  }
  const lines = content.trim().split("\n").filter(Boolean);
  if (lines.length === 0) errors.push("EPF file is empty.");
  for (const line of lines) {
    if (line.length < 20) errors.push("EPF record line too short.");
  }
  return errors;
}

export function validateSocsoFileContent(content: string, employerCode: string): string[] {
  const errors: string[] = [];
  if (!employerCode.trim() || employerCode === "PERKESO") {
    errors.push("Employer SOCSO code is required.");
  }
  const lines = content.split("\n").filter((line) => line.length > 0);
  if (lines.length === 0) errors.push("SOCSO file is empty.");
  for (const line of lines) {
    if (line.length !== PERKESO_ASSIST_RECORD_LENGTH) {
      errors.push(`PERKESO record must be ${PERKESO_ASSIST_RECORD_LENGTH} chars (got ${line.length}).`);
    }
    if (!line.startsWith(employerCode.padEnd(12).slice(0, 12))) {
      errors.push("PERKESO employer code mismatch at record start.");
    }
  }
  return errors;
}

export function validateKwspLineLayout(line: string, expectedFieldCount = 7): string[] {
  const errors: string[] = [];
  const parts = line.split("|");
  if (parts.length !== expectedFieldCount) {
    errors.push(`KWSP line must have ${expectedFieldCount} pipe fields (got ${parts.length}).`);
  }
  return errors;
}
