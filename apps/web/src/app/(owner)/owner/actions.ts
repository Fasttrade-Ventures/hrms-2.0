"use server";

import { revalidatePath } from "next/cache";

import type { ModuleKey, ProductTier } from "@hrms/platform";

import { requireRole } from "@/lib/auth/session";
import {
  updateOwnerModuleFlag,
  updateOwnerProductTier,
} from "@/lib/owner/entitlements";

export async function updateModuleFlagFormAction(formData: FormData): Promise<void> {
  await requireRole("organization_owner");

  const moduleKey = String(formData.get("module") ?? "") as ModuleKey;
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const session = await requireRole("organization_owner");
  await updateOwnerModuleFlag(moduleKey, enabled, session.user.id);
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/settings");
}

export async function updateProductTierFormAction(formData: FormData): Promise<void> {
  await requireRole("organization_owner");

  const tier = String(formData.get("tier") ?? "core") as ProductTier;
  const session = await requireRole("organization_owner");
  await updateOwnerProductTier(tier, session.user.id);
  revalidatePath("/owner/dashboard");
  revalidatePath("/owner/settings");
}
