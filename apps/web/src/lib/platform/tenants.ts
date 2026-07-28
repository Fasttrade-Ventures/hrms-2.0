import type { ProductTier } from "@hrms/platform";
import { isSaasMode } from "@hrms/platform";

import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

import { provisionTenant, type ProvisionTenantInput } from "./provision-tenant";

export type TenantListItem = {
  id: string;
  name: string;
  slug: string | null;
  productTier: ProductTier;
  createdAt: string;
  employeeCount: number;
};

export async function listTenants(): Promise<TenantListItem[]> {
  await requireRole("platform_administrator");
  if (!isSaasMode()) return [];

  const admin = createAdminClient();
  const { data: organizations, error } = await admin
    .from("organizations")
    .select("id, name, slug, product_tier, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: employeeCounts, error: countError } = await admin
    .from("employees")
    .select("organization_id");

  if (countError) throw new Error(countError.message);

  const counts = new Map<string, number>();
  for (const row of employeeCounts ?? []) {
    counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
  }

  return (organizations ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    productTier: row.product_tier as ProductTier,
    createdAt: row.created_at,
    employeeCount: counts.get(row.id) ?? 0,
  }));
}

export async function provisionTenantAsPlatformAdmin(
  input: ProvisionTenantInput,
): Promise<{ organizationId: string; slug: string }> {
  await requireRole("platform_administrator");
  if (!isSaasMode()) {
    throw new Error("Tenant provisioning is only available in SaaS deployment mode.");
  }

  const admin = createAdminClient();
  return provisionTenant(admin, input);
}

export async function getTenantById(tenantId: string): Promise<{ id: string; name: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("organizations").select("id, name").eq("id", tenantId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
