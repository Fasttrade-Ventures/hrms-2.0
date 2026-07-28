export const EMPLOYEE_IMPORT_HEADERS = [
  "full_name",
  "email",
  "join_date",
  "job_title",
  "branch",
  "department",
  "employee_number",
] as const;

export type EmployeeImportRowResult = {
  row: number;
  email: string;
  status: "success" | "error";
  employeeId?: string;
  employeeNumber?: string;
  message?: string;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

export function parseEmployeeImportCsv(text: string): Array<Record<string, string>> {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  if (!headerLine) return [];

  const headers = parseCsvLine(headerLine).map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() ?? "";
    });
    rows.push(record);
  }

  return rows;
}

export const EMPLOYEE_IMPORT_TEMPLATE = `${EMPLOYEE_IMPORT_HEADERS.join(",")}
Ahmad Faizal,ahmad.faizal@example.com,2026-01-15,Software Engineer,Kuala Lumpur HQ,Engineering,
Siti Nurhaliza,siti.nurhaliza@example.com,2026-02-01,HR Executive,Kuala Lumpur HQ,Human Resources,EMP-1002`;
