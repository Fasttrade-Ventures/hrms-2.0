import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export type BranchAdminContext = {
  session: Awaited<ReturnType<typeof requireRole>>;
  employeeId: string;
  organizationId: string;
  /** Primary branch for display (first scoped branch). */
  branchId: string;
  branchName: string;
  branchCode: string | null;
  /** All branches this admin may operate on. */
  branchIds: string[];
  employeeNumber: string;
  fullName: string;
};

/**
 * Resolves branch scope for a branch_admin.
 * Prefer `organization_membership_branches`; fall back to the linked employee's home branch.
 */
export async function requireBranchAdminContext(): Promise<BranchAdminContext> {
  const session = await requireRole("branch_admin");
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this branch admin account.");
  }

  const organizationId = await requireOrganizationId();
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

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  let branchIds: string[] = [];
  if (membership?.id) {
    const { data: scoped, error: scopedError } = await supabase
      .from("organization_membership_branches")
      .select("branch_id")
      .eq("membership_id", membership.id)
      .eq("organization_id", organizationId);
    if (scopedError && !scopedError.message.includes("does not exist")) {
      throw new Error(scopedError.message);
    }
    branchIds = (scoped ?? []).map((row) => row.branch_id);
  }

  if (branchIds.length === 0) {
    branchIds = [employee.branch_id];
  }

  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, name, state")
    .in("id", branchIds);

  if (branchError) throw new Error(branchError.message);
  if (!branches || branches.length === 0) {
    throw new Error("Branch not found.");
  }

  const primary =
    branches.find((row) => row.id === employee.branch_id) ?? branches[0]!;

  return {
    session,
    employeeId,
    organizationId,
    branchId: primary.id,
    branchName:
      branches.length > 1
        ? `${primary.name} (+${branches.length - 1})`
        : primary.name,
    branchCode: primary.state,
    branchIds,
    employeeNumber: employee.employee_number,
    fullName: employee.full_name,
  };
}
