import { requireManagerContext } from "@/lib/manager/context";
import { createClient } from "@/lib/supabase/server";

export type TeamPerformanceRow = {
  id: string;
  employeeName: string;
  cycleName: string;
  status: string;
  selfRating: number | null;
  managerRating: number | null;
};

export async function listTeamPerformance(): Promise<TeamPerformanceRow[]> {
  const { employeeId, organizationId } = await requireManagerContext();
  const supabase = await createClient();

  const { data: reports, error: reportsError } = await supabase
    .from("employees")
    .select("id, full_name, email")
    .eq("organization_id", organizationId)
    .eq("manager_employee_id", employeeId)
    .eq("status", "active");

  if (reportsError) throw new Error(reportsError.message);
  if (!reports?.length) return [];

  const reportIds = reports.map((r) => r.id);
  const nameById = new Map(reports.map((r) => [r.id, r.full_name ?? r.email]));

  const { data, error } = await supabase
    .from("performance_appraisals")
    .select("id, employee_id, status, self_rating, manager_rating, review_cycles(name)")
    .eq("organization_id", organizationId)
    .in("employee_id", reportIds)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeName: nameById.get(row.employee_id) ?? "Employee",
    cycleName: (row.review_cycles as { name?: string } | null)?.name ?? "Review cycle",
    status: row.status,
    selfRating: row.self_rating,
    managerRating: row.manager_rating,
  }));
}
