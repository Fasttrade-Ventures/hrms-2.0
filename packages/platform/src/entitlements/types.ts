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
  "assets",
  "performance",
];

export const PROFESSIONAL_MODULES: ModuleKey[] = [
  "ot",
  "claims",
  "replacement",
  "location",
  "import",
];

export const ENTERPRISE_MODULES: ModuleKey[] = [
  "payroll",
  "payouts",
  "audit",
  "api",
  "analytics",
  "recruitment",
  "integrations",
];
