import { requireRole } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit/log-event";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type ReviewCycleRow = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  closedAt: string | null;
  appraisalCount: number;
  pendingCount: number;
};

export type CycleAppraisalExportRow = {
  employeeNumber: string | null;
  employeeName: string;
  status: string;
  selfRating: number | null;
  selfComments: string | null;
  managerRating: number | null;
  managerComments: string | null;
};

export async function listReviewCycles(): Promise<ReviewCycleRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: cycles, error } = await supabase
    .from("review_cycles")
    .select("id, name, period_start, period_end, due_date, closed_at")
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: false });

  if (error) throw new Error(error.message);

  const rows: ReviewCycleRow[] = [];
  for (const cycle of cycles ?? []) {
    const { count: appraisalCount } = await supabase
      .from("performance_appraisals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("review_cycle_id", cycle.id);

    const { count: pendingCount } = await supabase
      .from("performance_appraisals")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("review_cycle_id", cycle.id)
      .eq("status", "pending");

    rows.push({
      id: cycle.id,
      name: cycle.name,
      periodStart: cycle.period_start,
      periodEnd: cycle.period_end,
      dueDate: cycle.due_date,
      closedAt: cycle.closed_at,
      appraisalCount: appraisalCount ?? 0,
      pendingCount: pendingCount ?? 0,
    });
  }

  return rows;
}

export async function createReviewCycle(input: {
  name: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
}): Promise<string> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("review_cycles")
    .insert({
      organization_id: organizationId,
      name: input.name,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      due_date: input.dueDate,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create review cycle.");
  return data.id;
}

export async function launchAppraisalsForCycle(cycleId: string, actorUserId?: string | null): Promise<number> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: cycle, error: cycleError } = await supabase
    .from("review_cycles")
    .select("closed_at")
    .eq("organization_id", organizationId)
    .eq("id", cycleId)
    .maybeSingle();

  if (cycleError) throw new Error(cycleError.message);
  if (!cycle) throw new Error("Review cycle not found.");
  if (cycle.closed_at) throw new Error("Cannot launch appraisals for a closed cycle.");

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (employeesError) throw new Error(employeesError.message);

  let created = 0;
  for (const employee of employees ?? []) {
    const { data: existing } = await supabase
      .from("performance_appraisals")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("employee_id", employee.id)
      .eq("review_cycle_id", cycleId)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("performance_appraisals").insert({
      organization_id: organizationId,
      employee_id: employee.id,
      review_cycle_id: cycleId,
      status: "draft",
    });

    if (!error) created += 1;
  }

  if (created > 0) {
    await logAuditEvent({
      organizationId,
      actorUserId: actorUserId ?? null,
      action: "performance.appraisals_launched",
      resourceType: "review_cycle",
      resourceId: cycleId,
      metadata: { created },
    });
  }

  return created;
}

export async function closeReviewCycle(cycleId: string, actorUserId?: string | null): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: cycle, error: cycleError } = await supabase
    .from("review_cycles")
    .select("id, closed_at")
    .eq("organization_id", organizationId)
    .eq("id", cycleId)
    .maybeSingle();

  if (cycleError) throw new Error(cycleError.message);
  if (!cycle) throw new Error("Review cycle not found.");
  if (cycle.closed_at) throw new Error("This review cycle is already closed.");

  const { error } = await supabase
    .from("review_cycles")
    .update({ closed_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("id", cycleId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    organizationId,
    actorUserId: actorUserId ?? null,
    action: "performance.cycle_closed",
    resourceType: "review_cycle",
    resourceId: cycleId,
  });
}

export async function listCycleAppraisalsForExport(cycleId: string): Promise<CycleAppraisalExportRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("performance_appraisals")
    .select(
      "status, self_rating, self_comments, manager_rating, manager_comments, employees(full_name, email, employee_number)",
    )
    .eq("organization_id", organizationId)
    .eq("review_cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;
    return {
      employeeNumber: employee?.employee_number ?? null,
      employeeName: employee?.full_name ?? employee?.email ?? "Employee",
      status: row.status,
      selfRating: row.self_rating,
      selfComments: row.self_comments,
      managerRating: row.manager_rating,
      managerComments: row.manager_comments,
    };
  });
}

function csvEscape(value: string | number | null): string {
  if (value == null) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function cycleAppraisalsToCsv(rows: CycleAppraisalExportRow[]): string {
  const header = [
    "Employee #",
    "Employee",
    "Status",
    "Self rating",
    "Self comments",
    "Manager rating",
    "Manager comments",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvEscape(row.employeeNumber),
        csvEscape(row.employeeName),
        csvEscape(row.status),
        csvEscape(row.selfRating),
        csvEscape(row.selfComments),
        csvEscape(row.managerRating),
        csvEscape(row.managerComments),
      ].join(","),
    ),
  ];
  return lines.join("\n");
}
