"use server";

import { revalidatePath } from "next/cache";

import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/keys";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import {
  HIRIX_CORE_KEY_NAME,
  HIRIX_CORE_SCOPES,
  findHirixCoreKey,
  liveHirixCoreKeyIds,
} from "@/lib/integrations/hirix-core/keys";

export type HirixCoreActionState = {
  error?: string;
  success?: string;
  /** Shown once, right after the key is created. Never stored or returned again. */
  secret?: string;
};

export type HirixCoreStatus = {
  active: boolean;
  keyPrefix: string | null;
  createdAt: string | null;
  lastUsedAt: string | null;
};

const REVALIDATE = "/hr/integrations/api";

async function requireAccess() {
  await requireModule("api");
  return requireRole("hr_administrator", "organization_owner");
}

export async function loadHirixCoreStatus(): Promise<HirixCoreStatus> {
  await requireAccess();
  const key = findHirixCoreKey(await listApiKeys(await requireOrganizationId()));
  return {
    active: key !== null,
    keyPrefix: key?.key_prefix ?? null,
    createdAt: key?.created_at ?? null,
    lastUsedAt: key?.last_used_at ?? null,
  };
}

/**
 * Creates the Hirix Core key. Any live Hirix Core key is revoked first, so a
 * double click or a rotation never leaves two working keys behind.
 */
export async function generateHirixCoreKeyAction(
  _prev: HirixCoreActionState,
): Promise<HirixCoreActionState> {
  try {
    const session = await requireAccess();
    const organizationId = await requireOrganizationId();

    for (const id of liveHirixCoreKeyIds(await listApiKeys(organizationId))) {
      await revokeApiKey(organizationId, id);
    }

    const created = await createApiKey({
      organizationId,
      name: HIRIX_CORE_KEY_NAME,
      createdByUserId: session.user.id,
      scopes: [...HIRIX_CORE_SCOPES],
    });

    revalidatePath(REVALIDATE);
    return {
      success: "Key created. Copy it now — it won't be shown again.",
      secret: created.secret,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create the key." };
  }
}

export async function revokeHirixCoreKeyAction(
  _prev: HirixCoreActionState,
): Promise<HirixCoreActionState> {
  try {
    await requireAccess();
    const organizationId = await requireOrganizationId();
    const ids = liveHirixCoreKeyIds(await listApiKeys(organizationId));
    if (ids.length === 0) return { error: "There is no active Hirix Core key." };
    for (const id of ids) await revokeApiKey(organizationId, id);
    revalidatePath(REVALIDATE);
    return { success: "Key revoked. Hirix Core can no longer add employees." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to revoke the key." };
  }
}
