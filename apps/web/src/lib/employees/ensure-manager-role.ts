import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Line managers need the `manager` membership role to open /manager/* portals
 * (approvals, team leave, etc.). Assigning someone as a reporting manager must
 * grant that role even if their portal role was left as employee.
 */
export async function ensureEmployeeHasManagerRole(
  admin: SupabaseClient,
  params: { organizationId: string; employeeId: string },
): Promise<void> {
  const { data: membership, error } = await admin
    .from("organization_memberships")
    .select("id, roles")
    .eq("organization_id", params.organizationId)
    .eq("employee_id", params.employeeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!membership) return;

  const roles = Array.isArray(membership.roles) ? membership.roles.map(String) : [];
  if (roles.includes("manager")) return;

  const nextRoles = roles.includes("employee") ? [...roles, "manager"] : ["employee", "manager", ...roles];
  const unique = [...new Set(nextRoles)];

  const { error: updateError } = await admin
    .from("organization_memberships")
    .update({ roles: unique })
    .eq("id", membership.id);

  if (updateError) throw new Error(updateError.message);
}
