"use server";

import { revalidatePath } from "next/cache";

import type { ProductTier } from "@hrms/platform";

import { startImpersonation, stopImpersonation } from "@/lib/platform/impersonation";
import { provisionTenantAsPlatformAdmin, updateTenantProductTier } from "@/lib/platform/tenants";
import { requireRole } from "@/lib/auth/session";

export type PlatformActionState = {
  error?: string;
  success?: string;
};

export async function provisionTenantAction(
  _prev: PlatformActionState,
  formData: FormData,
): Promise<PlatformActionState> {
  try {
    const result = await provisionTenantAsPlatformAdmin({
      company: String(formData.get("company") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      productTier: String(formData.get("productTier") ?? "core") as ProductTier,
    });

    revalidatePath("/platform/tenants");
    revalidatePath("/platform/dashboard");
    return { success: `Tenant "${result.slug}" provisioned successfully.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to provision tenant." };
  }
}

export async function impersonateTenantAction(formData: FormData): Promise<void> {
  const organizationId = String(formData.get("organizationId") ?? "");
  if (!organizationId) {
    throw new Error("Organization ID is required.");
  }
  await startImpersonation(organizationId);
}

export async function stopImpersonationAction(): Promise<void> {
  await stopImpersonation();
}

export async function updateTenantTierAction(formData: FormData): Promise<void> {
  const session = await requireRole("platform_administrator");
  const organizationId = String(formData.get("organizationId") ?? "");
  const tier = String(formData.get("tier") ?? "core") as ProductTier;

  if (!organizationId) {
    throw new Error("Organization ID is required.");
  }

  await updateTenantProductTier(organizationId, tier, session.user.id);
  revalidatePath("/platform/tenants");
}
