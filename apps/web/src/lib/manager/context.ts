import { requireRole } from "@/lib/auth/session";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function requireManagerContext() {
  const session = await requireRole("manager");
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this manager account.");
  }

  return {
    session,
    employeeId,
    organizationId: getOrganizationId(),
    userId: session.user.id,
  };
}
