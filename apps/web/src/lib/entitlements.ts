import type { ModuleKey } from "@hrms/platform";
import { createEnvEntitlementProvider } from "@hrms/platform";

export function getEntitlements() {
  return createEnvEntitlementProvider();
}

export function requireModule(module: ModuleKey): void {
  const entitlements = getEntitlements();
  if (!entitlements.hasModule(module)) {
    throw new Error(`The ${module} module is not enabled on your plan.`);
  }
}
