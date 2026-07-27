import type { AssetCategoryField } from "@hrms/domain";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { logAssetEvent } from "./audit";
import type { AssetCategoryRow } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function mapCategoryRow(row: {
  id: string;
  name: string;
  description: string | null;
  field_schema: unknown;
  sort_order: number;
  is_active: boolean;
}): AssetCategoryRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    fieldSchema: (Array.isArray(row.field_schema) ? row.field_schema : []) as AssetCategoryField[],
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function listAssetCategories(options?: {
  activeOnly?: boolean;
}): Promise<AssetCategoryRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  let query = supabase
    .from("asset_categories")
    .select("id, name, description, field_schema, sort_order, is_active")
    .eq("organization_id", organizationId)
    .order("sort_order")
    .order("name");

  if (options?.activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCategoryRow);
}

export async function getAssetCategory(categoryId: string): Promise<AssetCategoryRow | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("asset_categories")
    .select("id, name, description, field_schema, sort_order, is_active")
    .eq("organization_id", organizationId)
    .eq("id", categoryId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCategoryRow(data) : null;
}

export async function createAssetCategory(input: {
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  fieldSchema: AssetCategoryField[];
}): Promise<string> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("asset_categories")
    .insert({
      organization_id: organizationId,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
      field_schema: input.fieldSchema,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await logAssetEvent("asset.category.created", "asset_category", data.id, { name: input.name });
  return data.id;
}

export async function updateAssetCategory(
  categoryId: string,
  input: {
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    fieldSchema: AssetCategoryField[];
  },
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { error } = await supabase
    .from("asset_categories")
    .update({
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sortOrder ?? 0,
      is_active: input.isActive ?? true,
      field_schema: input.fieldSchema,
      updated_at: new Date().toISOString(),
    })
    .eq("id", categoryId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  await logAssetEvent("asset.category.updated", "asset_category", categoryId, { name: input.name });
}
