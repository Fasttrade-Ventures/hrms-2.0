import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function requireBranchAdminContext() {
  const session = await requireRole("branch_admin");
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this branch admin account.");
  }

  const supabase = await createClient();
  const { data: employee, error } = await supabase
    .from("employees")
    .select("id, branch_id, full_name, employee_number")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee?.branch_id) {
    throw new Error("Branch admin account is not assigned to a branch.");
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, name, state")
    .eq("id", employee.branch_id)
    .maybeSingle();

  if (branchError) throw new Error(branchError.message);
  if (!branch) throw new Error("Branch not found.");

  return {
    session,
    employeeId,
    organizationId: getOrganizationId(),
    branchId: branch.id,
    branchName: branch.name,
    branchCode: branch.state,
    employeeNumber: employee.employee_number,
    fullName: employee.full_name,
  };
}
