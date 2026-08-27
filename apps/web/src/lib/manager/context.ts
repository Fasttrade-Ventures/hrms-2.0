import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function requireManagerContext() {
  const session = await requireRole("manager");
  const employeeId = session.membership.employeeId;

  if (!employeeId) {
    throw new Error("No employee record linked to this manager account.");
  }

  return {
    session,
    employeeId,
    organizationId: await requireOrganizationId(),
    userId: session.user.id,
  };
}
