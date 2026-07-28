import { createClient } from "@/lib/supabase/server";

import type { AppraisalDetail } from "./types";

function mapAppraisalRow(row: {
  id: string;
  employee_id: string;
  status: string;
  self_rating: number | null;
  self_comments: string | null;
  manager_rating: number | null;
  manager_comments: string | null;
  employees:
    | { full_name: string | null; email: string | null; employee_number: string | null }
    | Array<{ full_name: string | null; email: string | null; employee_number: string | null }>
    | null;
  review_cycles:
    | {
        id: string;
        name: string;
        period_start: string;
        period_end: string;
        due_date: string;
        closed_at: string | null;
      }
    | Array<{
        id: string;
        name: string;
        period_start: string;
        period_end: string;
        due_date: string;
        closed_at: string | null;
      }>
    | null;
}): AppraisalDetail {
  const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  const cycle = Array.isArray(row.review_cycles) ? row.review_cycles[0] : row.review_cycles;

  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: employee?.full_name ?? employee?.email ?? "Employee",
    employeeNumber: employee?.employee_number ?? null,
    cycleId: cycle?.id ?? "",
    cycleName: cycle?.name ?? "Review cycle",
    periodStart: cycle?.period_start ?? "",
    periodEnd: cycle?.period_end ?? "",
    dueDate: cycle?.due_date ?? "",
    cycleClosed: Boolean(cycle?.closed_at),
    status: row.status as AppraisalDetail["status"],
    selfRating: row.self_rating,
    selfComments: row.self_comments,
    managerRating: row.manager_rating,
    managerComments: row.manager_comments,
  };
}

const APPRAISAL_SELECT = `
  id,
  employee_id,
  status,
  self_rating,
  self_comments,
  manager_rating,
  manager_comments,
  employees(full_name, email, employee_number),
  review_cycles(id, name, period_start, period_end, due_date, closed_at)
`;

export async function getAppraisalDetail(
  organizationId: string,
  appraisalId: string,
): Promise<AppraisalDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("performance_appraisals")
    .select(APPRAISAL_SELECT)
    .eq("organization_id", organizationId)
    .eq("id", appraisalId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapAppraisalRow(data);
}

export async function assertAppraisalEditable(appraisal: AppraisalDetail): Promise<void> {
  if (appraisal.cycleClosed) {
    throw new Error("This review cycle is closed.");
  }
}
