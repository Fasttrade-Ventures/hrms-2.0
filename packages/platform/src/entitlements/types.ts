export type ProductTier = "core" | "professional" | "enterprise";

export type ModuleKey =
  | "location"
  | "ot"
  | "claims"
  | "replacement"
  | "performance"
  | "assets"
  | "documents"
  | "announcements"
  | "calendar"
  | "payouts"
  | "audit"
  | "import"
  | "payroll"
  | "api"
  | "analytics"
  | "recruitment"
  | "integrations";

export type EntitlementProvider = {
  tier: ProductTier;
  hasModule(module: ModuleKey): boolean;
  hasCapability(capability: string): boolean;
};

export const CORE_MODULES: ModuleKey[] = [
  "announcements",
  "calendar",
  "documents",
];

export const PROFESSIONAL_MODULES: ModuleKey[] = [
  "assets",
  "performance",
  "payroll",
  "ot",
  "claims",
  "replacement",
  "location",
  "import",
];

export const ENTERPRISE_MODULES: ModuleKey[] = [
  "payouts",
  "audit",
  "api",
  "analytics",
  "recruitment",
  "integrations",
];

/** Lower = Core, middle = Professional, high = Enterprise. Higher packages include every feature below them. */
export function tierIncludesModule(tier: ProductTier, module: ModuleKey): boolean {
  if (CORE_MODULES.includes(module)) return true;
  if (PROFESSIONAL_MODULES.includes(module)) return tier === "professional" || tier === "enterprise";
  if (ENTERPRISE_MODULES.includes(module)) return tier === "enterprise";
  return false;
}
