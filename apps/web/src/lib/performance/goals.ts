import { requireAuth } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createClient } from "@/lib/supabase/server";
import { assertGoalCount } from "@/lib/hr/pulse";

export type GoalRow = {
  id: string;
  title: string;
  note: string | null;
  status: string;
  managerNote: string | null;
};

export async function listGoals(reviewCycleId: string, employeeId: string): Promise<GoalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appraisal_goals")
    .select("id, title, note, status, manager_note")
    .eq("organization_id", await requireOrganizationId())
    .eq("review_cycle_id", reviewCycleId)
    .eq("employee_id", employeeId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    status: row.status as string,
    managerNote: (row.manager_note as string | null) ?? null,
  }));
}

export async function addGoal(reviewCycleId: string, title: string, note: string): Promise<void> {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account.");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("appraisal_goals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("review_cycle_id", reviewCycleId)
    .eq("employee_id", employeeId);
  if (countError) throw new Error(countError.message);
  assertGoalCount(count ?? 0);

  const { error } = await supabase.from("appraisal_goals").insert({
    organization_id: organizationId,
    review_cycle_id: reviewCycleId,
    employee_id: employeeId,
    title: title.trim(),
    note: note.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function markGoalDone(goalId: string): Promise<void> {
  const session = await requireAuth();
  const employeeId = session.membership.employeeId;
  if (!employeeId) throw new Error("No employee record linked to this account.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("appraisal_goals")
    .update({ status: "done" })
    .eq("id", goalId)
    .eq("organization_id", await requireOrganizationId())
    .eq("employee_id", employeeId);
  if (error) throw new Error(error.message);
}

export async function commentOnGoal(goalId: string, managerNote: string): Promise<void> {
  const session = await requireAuth();
  const managerEmployeeId = session.membership.employeeId;
  if (!managerEmployeeId) throw new Error("No employee record linked to this account.");
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();
  const { data: goal, error } = await supabase
    .from("appraisal_goals")
    .select("employee_id")
    .eq("id", goalId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !goal) throw new Error(error?.message ?? "Goal not found.");

  const { data: employee } = await supabase
    .from("employees")
    .select("manager_employee_id")
    .eq("id", goal.employee_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (employee?.manager_employee_id !== managerEmployeeId) {
    throw new Error("Only this employee's manager can comment on the goal.");
  }

  const { error: updateError } = await supabase
    .from("appraisal_goals")
    .update({ manager_note: managerNote.trim() || null })
    .eq("id", goalId)
    .eq("organization_id", organizationId);
  if (updateError) throw new Error(updateError.message);
}
