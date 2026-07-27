import { logAuditEvent } from "@/lib/audit/log-event";
import { getSession } from "@/lib/auth/session";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function logAssetEvent(
  action: string,
  resourceType: "asset" | "asset_category" | "asset_request",
  resourceId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const session = await getSession().catch(() => null);
  await logAuditEvent({
    organizationId: getOrganizationId(),
    actorUserId: session?.user.id ?? null,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}
