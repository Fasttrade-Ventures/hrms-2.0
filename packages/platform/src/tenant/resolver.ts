import { getDeploymentMode } from "../deployment";
import type { EntitlementProvider } from "../entitlements/types";
import { createEnvEntitlementProvider } from "../entitlements/env-provider";
import { createDbEntitlementProvider } from "../entitlements/db-provider";

export type TenantContext = {
  organizationId: string;
  deploymentMode: ReturnType<typeof getDeploymentMode>;
  entitlements: EntitlementProvider;
};

export type ResolveTenantInput = {
  userId?: string;
  organizationId?: string;
  loadOrgEntitlements?: (orgId: string) => Promise<EntitlementProvider>;
};

export async function resolveTenant(input: ResolveTenantInput): Promise<TenantContext> {
  const mode = getDeploymentMode();

  if (mode === "standalone") {
    const orgId = process.env.DEFAULT_ORGANIZATION_ID ?? input.organizationId;
    if (!orgId) {
      throw new Error("DEFAULT_ORGANIZATION_ID is required in standalone mode");
    }
    return {
      organizationId: orgId,
      deploymentMode: mode,
      entitlements: createEnvEntitlementProvider(),
    };
  }

  if (!input.organizationId) {
    throw new Error("organizationId is required in SaaS mode");
  }

  const entitlements = input.loadOrgEntitlements
    ? await input.loadOrgEntitlements(input.organizationId)
    : createDbEntitlementProvider({ tier: "core", modules: {} });

  return {
    organizationId: input.organizationId,
    deploymentMode: mode,
    entitlements,
  };
}
