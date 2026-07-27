import { buildSimplePdf } from "@/lib/files/simple-pdf";

import type { StatutoryExportRow } from "./store";
import { mapStatutoryRows } from "./statutory";
import { loadPayrunBranchItems, storePayrollExport } from "./store";

export function buildEaPdfLines(input: {
  employerName: string;
  employeeName: string;
  icNumber: string;
  calendarYear: number;
  gross: number;
  epfEmployee: number;
  socsoEmployee: number;
  eisEmployee: number;
  pcb: number;
}): Uint8Array {
  return buildSimplePdf([
    "FORM EA — EMPLOYMENT INCOME STATEMENT",
    `Year: ${input.calendarYear}`,
    `Employer: ${input.employerName}`,
    `Employee: ${input.employeeName}`,
    `IC: ${input.icNumber}`,
    "",
    `Gross remuneration: RM ${input.gross.toFixed(2)}`,
    `EPF (employee): RM ${input.epfEmployee.toFixed(2)}`,
    `SOCSO (employee): RM ${input.socsoEmployee.toFixed(2)}`,
    `EIS (employee): RM ${input.eisEmployee.toFixed(2)}`,
    `PCB: RM ${input.pcb.toFixed(2)}`,
    "Benefits in kind: RM 0.00",
  ]);
}

export function buildCp8dCsv(
  rows: Array<Pick<StatutoryExportRow, "employeeNumber" | "employeeName" | "icNumber" | "taxNumber" | "grossPay" | "epfEmployee" | "socsoEmployee" | "eisEmployee" | "pcb">>,
  calendarYear: number,
): string {
  const header =
    "Year,Employee Number,Name,IC,Tax Number,Gross,EPF Employee,SOCSO Employee,EIS Employee,PCB";
  const lines = rows.map((row) =>
    [
      calendarYear,
      row.employeeNumber,
      `"${row.employeeName.replace(/"/g, '""')}"`,
      row.icNumber,
      row.taxNumber,
      row.grossPay.toFixed(2),
      row.epfEmployee.toFixed(2),
      row.socsoEmployee.toFixed(2),
      row.eisEmployee.toFixed(2),
      row.pcb.toFixed(2),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

type YtdBalanceRow = {
  ytd_gross: number | string;
  ytd_epf_employee: number | string;
  ytd_socso_employee: number | string;
  ytd_eis_employee: number | string;
  ytd_pcb: number | string;
  employees: {
    employee_number?: string;
    full_name?: string;
    branch_id?: string;
    employee_profiles?: { ic_number?: string; tax_number?: string } | Array<{ ic_number?: string; tax_number?: string }>;
  } | Array<{
    employee_number?: string;
    full_name?: string;
    branch_id?: string;
    employee_profiles?: { ic_number?: string; tax_number?: string } | Array<{ ic_number?: string; tax_number?: string }>;
  }> | null;
};

export function mapYtdBalancesToCp8dRows(rows: YtdBalanceRow[], branchId?: string | null) {
  return rows.flatMap((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee) return [];
    if (branchId && employee.branch_id !== branchId) return [];

    const profile = Array.isArray(employee.employee_profiles)
      ? employee.employee_profiles[0]
      : employee.employee_profiles;

    return [
      {
        employeeNumber: employee.employee_number ?? "",
        employeeName: employee.full_name ?? "Employee",
        icNumber: profile?.ic_number ?? "",
        taxNumber: profile?.tax_number ?? "",
        grossPay: Number(row.ytd_gross),
        epfEmployee: Number(row.ytd_epf_employee),
        socsoEmployee: Number(row.ytd_socso_employee),
        eisEmployee: Number(row.ytd_eis_employee),
        pcb: Number(row.ytd_pcb),
      },
    ];
  });
}

export async function generateEaPdfForEmployee(
  employeeId: string,
  calendarYear: number,
  actorUserId: string,
): Promise<{ exportId: string; downloadPath: string; fileName: string }> {
  const { createClient } = await import("@/lib/supabase/server");
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  const supabase = await createClient();

  const { data: ytd } = await supabase
    .from("payroll_ytd_balances")
    .select("ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb")
    .eq("employee_id", employeeId)
    .eq("calendar_year", calendarYear)
    .maybeSingle();

  const { data: employee } = await supabase
    .from("employees")
    .select("full_name, employee_profiles(ic_number)")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!employee) throw new Error("Employee not found.");
  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const { data: org } = await supabase.from("organizations").select("name").eq("id", organizationId).maybeSingle();

  const pdf = buildEaPdfLines({
    employerName: org?.name ?? "Employer",
    employeeName: employee.full_name,
    icNumber: profile?.ic_number ?? "",
    calendarYear,
    gross: Number(ytd?.ytd_gross ?? 0),
    epfEmployee: Number(ytd?.ytd_epf_employee ?? 0),
    socsoEmployee: Number(ytd?.ytd_socso_employee ?? 0),
    eisEmployee: Number(ytd?.ytd_eis_employee ?? 0),
    pcb: Number(ytd?.ytd_pcb ?? 0),
  });

  return storePayrollExport({
    payrunId: null,
    branchId: null,
    exportType: "ea_pdf",
    fileName: `ea-${calendarYear}-${employeeId.slice(0, 8)}.pdf`,
    contentType: "application/pdf",
    body: pdf,
    generatedBy: actorUserId,
  });
}

export async function generateEaPdfBulk(
  calendarYear: number,
  actorUserId: string,
  branchId?: string | null,
) {
  const { createClient } = await import("@/lib/supabase/server");
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  const supabase = await createClient();

  const { data: ytdRows, error: ytdError } = await supabase
    .from("payroll_ytd_balances")
    .select(
      `employee_id,
       employees(id, full_name, employee_number, branch_id)`,
    )
    .eq("organization_id", organizationId)
    .eq("calendar_year", calendarYear);

  if (ytdError) throw new Error(ytdError.message);

  const employees = (ytdRows ?? []).flatMap((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    if (!employee?.id) return [];
    if (branchId && employee.branch_id !== branchId) return [];
    return [
      {
        id: employee.id,
        name: employee.full_name ?? "Employee",
        number: employee.employee_number ?? "",
      },
    ];
  });

  if (employees.length === 0) {
    throw new Error(
      `No YTD balances for ${calendarYear}. Lock payruns to populate YTD, or enter opening balances.`,
    );
  }

  const manifestLines = ["Employee Number,Name,Download Path"];
  for (const employee of employees) {
    const result = await generateEaPdfForEmployee(employee.id, calendarYear, actorUserId);
    manifestLines.push(
      [
        employee.number,
        `"${employee.name.replace(/"/g, '""')}"`,
        result.downloadPath,
      ].join(","),
    );
  }

  const content = manifestLines.join("\n");

  return storePayrollExport({
    payrunId: null,
    branchId: branchId ?? null,
    exportType: "ea_bulk_manifest",
    fileName: `ea-manifest-${calendarYear}-${branchId ?? "org"}.csv`,
    contentType: "text/csv",
    body: new TextEncoder().encode(content),
    generatedBy: actorUserId,
  });
}

export async function generateCp8dExport(
  calendarYear: number,
  actorUserId: string,
  branchId?: string | null,
) {
  const { createClient } = await import("@/lib/supabase/server");
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  const supabase = await createClient();

  const { data: ytdRows, error: ytdError } = await supabase
    .from("payroll_ytd_balances")
    .select(
      `ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb,
       employees(employee_number, full_name, branch_id, employee_profiles(ic_number, tax_number))`,
    )
    .eq("organization_id", organizationId)
    .eq("calendar_year", calendarYear);

  if (ytdError) throw new Error(ytdError.message);

  let cp8dRows = mapYtdBalancesToCp8dRows((ytdRows ?? []) as YtdBalanceRow[], branchId ?? null);

  if (cp8dRows.length === 0) {
    throw new Error(
      `No YTD balances for ${calendarYear}. Lock payruns to populate YTD, or enter opening balances.`,
    );
  }

  const content = buildCp8dCsv(cp8dRows, calendarYear);

  return storePayrollExport({
    payrunId: null,
    branchId: branchId ?? null,
    exportType: "cp8d",
    fileName: `cp8d-${calendarYear}-${branchId ?? "org"}.csv`,
    contentType: "text/csv",
    body: new TextEncoder().encode(content),
    generatedBy: actorUserId,
  });
}
