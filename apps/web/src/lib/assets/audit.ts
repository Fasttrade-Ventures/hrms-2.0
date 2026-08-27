import { logAuditEvent } from "@/lib/audit/log-event";
import { getSession } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function logAssetEvent(
  action: string,
  resourceType: "asset" | "asset_category" | "asset_request",
  resourceId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const session = await getSession().catch(() => null);
  await logAuditEvent({
    organizationId: await requireOrganizationId(),
    actorUserId: session?.user.id ?? null,
    action,
    resourceType,
    resourceId,
    metadata,
  });
}
