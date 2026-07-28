"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/keys";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function createApiKeyAction(
  _prev: { error?: string; secret?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; secret?: string; success?: string }> {
  try {
    await requireModule("api");
    const session = await requireRole("hr_administrator", "organization_owner");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };

    const created = await createApiKey({
      organizationId: getOrganizationId(),
      name,
      createdByUserId: session.user.id,
    });

    revalidatePath("/hr/integrations/api");
    return { success: "API key created. Copy the secret now — it won't be shown again.", secret: created.secret };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create API key." };
  }
}

export async function revokeApiKeyAction(keyId: string): Promise<void> {
  await requireModule("api");
  await requireRole("hr_administrator", "organization_owner");
  await revokeApiKey(getOrganizationId(), keyId);
  revalidatePath("/hr/integrations/api");
}

export async function loadApiKeys() {
  await requireModule("api");
  await requireRole("hr_administrator", "organization_owner");
  return listApiKeys(getOrganizationId());
}
