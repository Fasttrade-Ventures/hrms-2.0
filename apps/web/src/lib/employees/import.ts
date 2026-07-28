import { createEmployeeSchema } from "@hrms/validation";

import { createEmployeeRecord } from "./create-employee";
import {
  parseEmployeeImportCsv,
  type EmployeeImportRowResult,
} from "./import-csv";
import { createClient } from "@/lib/supabase/server";

export type { EmployeeImportRowResult } from "./import-csv";

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
