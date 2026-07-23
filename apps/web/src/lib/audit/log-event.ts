import { createAdminClient } from "@/lib/supabase/admin";

type AuditEventInput = {
  organizationId?: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const organizationId = input.organizationId ?? process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) return;

  try {
    const admin = createAdminClient();
    await admin.from("audit_events").insert({
      organization_id: organizationId,
      actor_user_id: input.actorUserId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Audit must not block flows.
  }
}
