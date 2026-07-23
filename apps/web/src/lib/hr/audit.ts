import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AuditEventRow = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
};

export async function listAuditEvents(): Promise<AuditEventRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_events")
    .select("id, action, resource_type, resource_id, occurred_at, metadata")
    .eq("organization_id", getOrganizationId())
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    occurredAt: row.occurred_at,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
  }));
}
