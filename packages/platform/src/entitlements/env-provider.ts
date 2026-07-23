import type { EntitlementProvider, ModuleKey, ProductTier } from "./types";
import { CORE_MODULES, ENTERPRISE_MODULES, PROFESSIONAL_MODULES } from "./types";

function parseTier(): ProductTier {
  const raw = process.env.PRODUCT_TIER?.toLowerCase();
  if (raw === "professional" || raw === "pro") return "professional";
  if (raw === "enterprise" || raw === "ent") return "enterprise";
  return "core";
}

function parseModuleOverrides(): Partial<Record<ModuleKey, boolean>> {
  const json = process.env.MODULE_OVERRIDES;
  if (!json) return {};
  try {
    return JSON.parse(json) as Partial<Record<ModuleKey, boolean>>;
  } catch {
    return {};
  }
}

export function createEnvEntitlementProvider(): EntitlementProvider {
  const tier = parseTier();
  const overrides = parseModuleOverrides();

  const enabled = new Set<ModuleKey>([...CORE_MODULES]);
  if (tier === "professional" || tier === "enterprise") {
    PROFESSIONAL_MODULES.forEach((m) => enabled.add(m));
  }
  if (tier === "enterprise") {
    ENTERPRISE_MODULES.forEach((m) => enabled.add(m));
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value) enabled.add(key as ModuleKey);
    else enabled.delete(key as ModuleKey);
  }

  return {
    tier,
    hasModule(module: ModuleKey) {
      return enabled.has(module);
    },
    hasCapability(capability: string) {
      if (capability.startsWith("module:")) {
        return enabled.has(capability.slice(7) as ModuleKey);
      }
      return tier === "enterprise";
    },
  };
}
