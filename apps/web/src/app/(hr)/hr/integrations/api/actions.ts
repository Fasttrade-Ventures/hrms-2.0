"use server";

import { revalidatePath } from "next/cache";

import { API_SCOPES, type ApiScope } from "@/lib/api/auth";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/keys";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function createApiKeyAction(
  _prev: { error?: string; secret?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; secret?: string; success?: string }> {
  try {
    await requireModule("api");
    const session = await requireRole("hr_administrator", "organization_owner");
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Name is required." };
    const scopes = API_SCOPES.filter((scope) => formData.get(scope) === "on");
    if (scopes.length === 0) return { error: "Choose at least one permission." };

    const created = await createApiKey({
      organizationId: await requireOrganizationId(),
      name,
      createdByUserId: session.user.id,
      scopes: scopes as ApiScope[],
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
  await revokeApiKey(await requireOrganizationId(), keyId);
  revalidatePath("/hr/integrations/api");
}

export async function loadApiKeys() {
  await requireModule("api");
  await requireRole("hr_administrator", "organization_owner");
  return listApiKeys(await requireOrganizationId());
}
