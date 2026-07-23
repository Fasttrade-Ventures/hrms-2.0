import { createAdminClient } from "@/lib/supabase/admin";

type EmployeeAuditInput = {
  action: string;
  actorUserId: string;
  organizationId?: string;
  employeeId: string;
  metadata?: Record<string, unknown>;
};

export async function logEmployeeEvent(input: EmployeeAuditInput): Promise<void> {
  const organizationId = input.organizationId ?? process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    return;
  }

  try {
    const admin = createAdminClient();

    await admin.from("audit_events").insert({
      organization_id: organizationId,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: "employee",
      resource_id: input.employeeId,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit logging must not block employee flows.
  }
}
