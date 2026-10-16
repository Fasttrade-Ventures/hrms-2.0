import type { EntitlementProvider, ModuleKey, ProductTier } from "./types";
import { CORE_MODULES, ENTERPRISE_MODULES, PROFESSIONAL_MODULES, tierIncludesModule } from "./types";

export function createDbEntitlementProvider(config: {
  tier: ProductTier;
  modules: Partial<Record<ModuleKey, boolean>>;
}): EntitlementProvider {
  const enabled = new Set<ModuleKey>([...CORE_MODULES]);
  if (config.tier === "professional" || config.tier === "enterprise") {
    PROFESSIONAL_MODULES.forEach((m) => enabled.add(m));
  }
  if (config.tier === "enterprise") {
    ENTERPRISE_MODULES.forEach((m) => enabled.add(m));
  }
  for (const [key, value] of Object.entries(config.modules)) {
    const moduleKey = key as ModuleKey;
    if (!tierIncludesModule(config.tier, moduleKey)) continue;
    if (value) enabled.add(moduleKey);
    else enabled.delete(moduleKey);
  }

  return {
    tier: config.tier,
    hasModule(module: ModuleKey) {
      return enabled.has(module);
    },
    hasCapability(capability: string) {
      if (capability.startsWith("module:")) {
        return enabled.has(capability.slice(7) as ModuleKey);
      }
      return config.tier === "enterprise";
    },
  };
}
