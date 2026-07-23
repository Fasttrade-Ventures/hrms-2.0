import { createAdminClient } from "@/lib/supabase/admin";

type AuthAuditInput = {
  action: string;
  actorUserId?: string | null;
  organizationId?: string;
  email?: string;
  metadata?: Record<string, unknown>;
};

export async function logAuthEvent(input: AuthAuditInput): Promise<void> {
  const organizationId = input.organizationId ?? process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    return;
  }

  try {
    const admin = createAdminClient();

    await admin.from("audit_events").insert({
      organization_id: organizationId,
      actor_user_id: input.actorUserId ?? null,
      action: input.action,
      resource_type: "auth",
      resource_id: input.actorUserId ?? input.email ?? "anonymous",
      metadata: {
        ...(input.metadata ?? {}),
        ...(input.email ? { email: input.email } : {}),
      },
    });
  } catch {
    // Audit logging must not block auth flows.
  }
}
