import { createEmployeeSchema } from "@hrms/validation";

import { createEmployeeRecord } from "./create-employee";
import { createClient } from "@/lib/supabase/server";

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

const importRowSchema = createEmployeeSchema.pick({
  fullName: true,
  email: true,
  joinDate: true,
});

function mapCsvRow(raw: Record<string, string>) {
  return {
    fullName: raw.full_name?.trim() ?? "",
    email: raw.email?.trim() ?? "",
    joinDate: raw.join_date?.trim() ?? "",
    jobTitle: raw.job_title?.trim() || null,
    employeeNumber: raw.employee_number?.trim() || undefined,
    branchName: raw.branch?.trim() || undefined,
    departmentName: raw.department?.trim() || undefined,
  };
}

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

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function resolveLookupIds(
  organizationId: string,
  branchName?: string,
  departmentName?: string,
): Promise<{ branchId: string | null; departmentId: string | null; error?: string }> {
  const supabase = await createClient();
  let branchId: string | null = null;
  let departmentId: string | null = null;

  if (branchName) {
    const { data } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("name", branchName)
      .maybeSingle();
    if (!data) return { branchId: null, departmentId: null, error: `Branch not found: ${branchName}` };
    branchId = data.id;
  }

  if (departmentName) {
    let query = supabase
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("name", departmentName);
    if (branchId) query = query.eq("branch_id", branchId);
    const { data } = await query.maybeSingle();
    if (!data) {
      return { branchId, departmentId: null, error: `Department not found: ${departmentName}` };
    }
    departmentId = data.id;
  }

  return { branchId, departmentId };
}

export async function importEmployeesFromCsv(
  csvText: string,
  actorUserId: string,
  options: { sendActivationEmail: boolean },
): Promise<{ results: EmployeeImportRowResult[]; successCount: number; errorCount: number }> {
  const organizationId = getOrganizationId();
  const parsedRows = parseEmployeeImportCsv(csvText);
  const results: EmployeeImportRowResult[] = [];

  for (let index = 0; index < parsedRows.length; index += 1) {
    const rowNumber = index + 2;
    const raw = parsedRows[index];
    if (!raw) continue;

    const mapped = mapCsvRow(raw);
    const parsed = importRowSchema.safeParse({
      fullName: mapped.fullName,
      email: mapped.email,
      joinDate: mapped.joinDate,
    });

    if (!parsed.success) {
      results.push({
        row: rowNumber,
        email: mapped.email || `row-${rowNumber}`,
        status: "error",
        message: parsed.error.issues.map((issue: { message: string }) => issue.message).join("; "),
      });
      continue;
    }

    const lookup = await resolveLookupIds(
      organizationId,
      mapped.branchName,
      mapped.departmentName,
    );

    if (lookup.error) {
      results.push({
        row: rowNumber,
        email: parsed.data.email,
        status: "error",
        message: lookup.error,
      });
      continue;
    }

    const input = createEmployeeSchema.parse({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      joinDate: parsed.data.joinDate,
      jobTitle: mapped.jobTitle,
      employeeNumber: mapped.employeeNumber,
      branchId: lookup.branchId,
      departmentId: lookup.departmentId,
      sendActivationEmail: options.sendActivationEmail,
      portalRole: "employee",
    });

    try {
      const created = await createEmployeeRecord(input, actorUserId);
      results.push({
        row: rowNumber,
        email: parsed.data.email,
        status: "success",
        employeeId: created.employeeId,
        employeeNumber: created.employeeNumber,
        message: created.activationEmailSent
          ? "Created and activation email sent."
          : created.activationEmailError
            ? `Created; activation email failed: ${created.activationEmailError}`
            : "Created.",
      });
    } catch (error) {
      results.push({
        row: rowNumber,
        email: parsed.data.email,
        status: "error",
        message: error instanceof Error ? error.message : "Import failed.",
      });
    }
  }

  const successCount = results.filter((row) => row.status === "success").length;
  const errorCount = results.filter((row) => row.status === "error").length;

  return { results, successCount, errorCount };
}

export const EMPLOYEE_IMPORT_TEMPLATE = `${EMPLOYEE_IMPORT_HEADERS.join(",")}
Ahmad Faizal,ahmad.faizal@example.com,2026-01-15,Software Engineer,Kuala Lumpur HQ,Engineering,
Siti Nurhaliza,siti.nurhaliza@example.com,2026-02-01,HR Executive,Kuala Lumpur HQ,Human Resources,EMP-1002`;
