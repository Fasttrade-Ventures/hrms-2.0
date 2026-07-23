import { requireManagerContext } from "@/lib/manager/context";
import { createClient } from "@/lib/supabase/server";

export type TeamCalendarEvent = {
  id: string;
  employeeName: string;
  title: string;
  startDate: string;
  endDate: string;
  status: string;
};

export async function listTeamCalendarEvents(): Promise<TeamCalendarEvent[]> {
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

  const today = new Date();
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 60);

  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, employee_id, start_date, end_date, status, leave_types(name)")
    .eq("organization_id", organizationId)
    .in("employee_id", reportIds)
    .in("status", ["pending", "approved"])
    .gte("end_date", today.toISOString().slice(0, 10))
    .lte("start_date", horizon.toISOString().slice(0, 10))
    .order("start_date");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeName: nameById.get(row.employee_id) ?? "Employee",
    title: (row.leave_types as { name?: string } | null)?.name ?? "Leave",
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
  }));
}
