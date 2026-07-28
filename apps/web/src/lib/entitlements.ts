import { cache } from "react";

import type { EntitlementProvider, ModuleKey } from "@hrms/platform";
import { createDbEntitlementProvider, createEnvEntitlementProvider } from "@hrms/platform";

import { getEffectiveOrganizationId } from "@/lib/auth/organization-context";
import { getImpersonationOrgId } from "@/lib/platform/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const getEntitlements = cache(async (): Promise<EntitlementProvider> => {
  const organizationId = await getEffectiveOrganizationId();
  if (!organizationId) {
    return createEnvEntitlementProvider();
  }

  const impersonating = Boolean(await getImpersonationOrgId());
  const supabase = impersonating ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("product_tier, module_flags")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return createEnvEntitlementProvider();
  }

  return createDbEntitlementProvider({
    tier: data.product_tier,
    modules: (data.module_flags ?? {}) as Partial<Record<ModuleKey, boolean>>,
  });
});

export async function requireModule(module: ModuleKey): Promise<void> {
  const entitlements = await getEntitlements();
  if (!entitlements.hasModule(module)) {
    throw new Error(`The ${module} module is not enabled on your plan.`);
  }
}

export async function requireProfessionalTier(): Promise<void> {
  const entitlements = await getEntitlements();
  if (entitlements.tier === "core") {
    throw new Error("This feature requires the Professional plan or higher.");
  }
}
