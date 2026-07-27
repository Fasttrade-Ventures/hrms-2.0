import { createAdminClient } from "@/lib/supabase/admin";

import { queueNotification } from "@/lib/notifications/queue";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function listHrAdminUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();
  const { data } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .contains("roles", ["hr_administrator"]);

  return (data ?? []).map((row) => row.user_id).filter(Boolean) as string[];
}

export async function notifyAssetAssigned(input: {
  employeeUserId: string | null;
  assetId: string;
  assetName: string;
}): Promise<void> {
  if (!input.employeeUserId) return;
  const organizationId = getOrganizationId();
  await queueNotification({
    organizationId,
    recipientUserId: input.employeeUserId,
    channel: "in_app",
    template: "asset.assigned",
    payload: {
      assetId: input.assetId,
      assetName: input.assetName,
      href: `/employee/assets/${input.assetId}`,
    },
    idempotencyKey: `asset-assigned:${input.assetId}:${input.employeeUserId}:${Date.now()}`,
  });
}

export async function notifyAssetReturned(input: {
  employeeUserId: string | null;
  assetId: string;
  assetName: string;
}): Promise<void> {
  if (!input.employeeUserId) return;
  const organizationId = getOrganizationId();
  await queueNotification({
    organizationId,
    recipientUserId: input.employeeUserId,
    channel: "in_app",
    template: "asset.returned",
    payload: {
      assetId: input.assetId,
      assetName: input.assetName,
      href: `/employee/assets/${input.assetId}`,
    },
    idempotencyKey: `asset-returned:${input.assetId}:${input.employeeUserId}:${Date.now()}`,
  });
}

export async function notifyAssetRequestToHr(input: {
  assetId: string;
  assetName: string;
  employeeName: string;
  kind: string;
  requestId: string;
}): Promise<void> {
  const organizationId = getOrganizationId();
  const hrAdmins = await listHrAdminUserIds();

  for (const userId of hrAdmins) {
    await queueNotification({
      organizationId,
      recipientUserId: userId,
      channel: "in_app",
      template: "asset.request",
      payload: {
        assetId: input.assetId,
        assetName: input.assetName,
        employeeName: input.employeeName,
        kind: input.kind,
        href: `/hr/assets/${input.assetId}`,
      },
      idempotencyKey: `asset-request:${input.requestId}:${userId}`,
    });
  }
}
