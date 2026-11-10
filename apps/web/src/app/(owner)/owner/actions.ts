"use server";

import { revalidatePath } from "next/cache";

import type { ModuleKey, ProductTier } from "@hrms/platform";

import { requireRole } from "@/lib/auth/session";
import {
  updateOwnerCompanySettings,
  updateOwnerModuleFlag,
  updateOwnerPayrollDutySegregation,
  updateOwnerProductTier,
} from "@/lib/owner/entitlements";

export async function updateModuleFlagFormAction(formData: FormData): Promise<void> {
  await requireRole("organization_owner");

  const moduleKey = String(formData.get("module") ?? "") as ModuleKey;
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const session = await requireRole("organization_owner");
  await updateOwnerModuleFlag(moduleKey, enabled, session.user.id);
  revalidatePath("/", "layout");
}

export async function updateProductTierFormAction(formData: FormData): Promise<void> {
  await requireRole("organization_owner");

  const tier = String(formData.get("tier") ?? "core") as ProductTier;
  const session = await requireRole("organization_owner");
  await updateOwnerProductTier(tier, session.user.id);
  revalidatePath("/", "layout");
}

export async function updatePayrollDutySegregationFormAction(formData: FormData): Promise<void> {
  const session = await requireRole("organization_owner");
  const enabled = String(formData.get("enabled") ?? "") === "true";
  await updateOwnerPayrollDutySegregation(enabled, session.user.id);
  revalidatePath("/owner/settings");
}

export type CompanySettingsState = { error?: string; success?: string };

export async function updateCompanySettingsAction(
  _prevState: CompanySettingsState,
  formData: FormData,
): Promise<CompanySettingsState> {
  const session = await requireRole("organization_owner");

  try {
    await updateOwnerCompanySettings(
      {
        country: String(formData.get("country") ?? "MY"),
        abn: String(formData.get("abn") ?? ""),
        state: String(formData.get("state") ?? "").trim(),
      },
      session.user.id,
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save company settings." };
  }

  revalidatePath("/", "layout");
  return { success: "Company settings saved." };
}
