import type { AssetCategoryField } from "@hrms/domain";
import type { AssetStatus } from "@hrms/domain";
import { validateCustomValues } from "@hrms/domain";

import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { assignAsset } from "./assignments";
import { logAssetEvent } from "./audit";
import type {
  AssetAssignmentRow,
  AssetDetail,
  AssetListRow,
  AssetRegisterFilters,
  AssetRequestRow,
  EmployeeAssetAssignmentRow,
  MyAssetDetail,
  MyAssetRow,
} from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function mapAssignment(row: {
  id: string;
  employee_id: string | null;
  employee_name: string;
  employee_number: string | null;
  assigned_at: string;
  returned_at: string | null;
  acknowledged_at: string | null;
  notes: string | null;
}): AssetAssignmentRow {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeNumber: row.employee_number,
    assignedAt: row.assigned_at,
    returnedAt: row.returned_at,
    acknowledgedAt: row.acknowledged_at,
    notes: row.notes,
  };
}

export async function listAssets(filters: AssetRegisterFilters = {}): Promise<AssetListRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  let query = supabase
    .from("assets")
    .select(
      "id, name, serial_number, status, custom_values, asset_categories(name), branches(name)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);

  const { data: assets, error } = await query.limit(500);
  if (error) throw new Error(error.message);

  const assetIds = (assets ?? []).map((row) => row.id);
  const { data: assignments } = assetIds.length
    ? await supabase
        .from("asset_assignments")
        .select("id, asset_id, employee_id, employee_name, assigned_at")
        .eq("organization_id", organizationId)
        .in("asset_id", assetIds)
        .is("returned_at", null)
    : { data: [] };

  const assignmentByAsset = new Map(
    (assignments ?? []).map((row) => [row.asset_id, row]),
  );

  const q = filters.q?.trim().toLowerCase();
  const rows: AssetListRow[] = [];

  for (const row of assets ?? []) {
    const category = Array.isArray(row.asset_categories)
      ? row.asset_categories[0]
      : row.asset_categories;
    const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
    const active = assignmentByAsset.get(row.id);

    if (filters.assigneeId === "unassigned" && active) continue;
    if (filters.assigneeId && filters.assigneeId !== "unassigned") {
      if (!active || active.employee_id !== filters.assigneeId) continue;
    }

    if (q) {
      const haystack = [
        row.name,
        row.serial_number,
        category?.name,
        active?.employee_name,
        JSON.stringify(row.custom_values ?? {}),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    rows.push({
      id: row.id,
      name: row.name,
      serialNumber: row.serial_number,
      status: row.status as AssetStatus,
      categoryName: category?.name ?? "—",
      branchName: branch?.name ?? null,
      assigneeName: active?.employee_name ?? null,
      assignedAt: active?.assigned_at ?? null,
    });
  }

  return rows;
}

export async function getAssetDetail(assetId: string): Promise<AssetDetail | null> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: row, error } = await supabase
    .from("assets")
    .select(
      `id, name, serial_number, status, condition, notes, purchase_date, purchase_value,
       warranty_expires_on, custom_values, category_id,
       asset_categories(name, field_schema), branches(name)`,
    )
    .eq("organization_id", organizationId)
    .eq("id", assetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const category = Array.isArray(row.asset_categories) ? row.asset_categories[0] : row.asset_categories;
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;

  const { data: assignments } = await supabase
    .from("asset_assignments")
    .select(
      "id, employee_id, employee_name, employee_number, assigned_at, returned_at, acknowledged_at, notes",
    )
    .eq("asset_id", assetId)
    .order("assigned_at", { ascending: false });

  const active = (assignments ?? []).find((item) => !item.returned_at);

  const { data: requests } = await supabase
    .from("asset_requests")
    .select("id, kind, status, message, created_at, employees(full_name)")
    .eq("asset_id", assetId)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const openRequests: AssetRequestRow[] = (requests ?? []).map((item) => {
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    return {
      id: item.id,
      kind: item.kind,
      status: item.status,
      message: item.message,
      employeeName: (employee as { full_name?: string } | null)?.full_name ?? "Employee",
      createdAt: item.created_at,
    };
  });

  return {
    id: row.id,
    name: row.name,
    serialNumber: row.serial_number,
    status: row.status as AssetStatus,
    categoryId: row.category_id,
    categoryName: category?.name ?? "—",
    branchName: branch?.name ?? null,
    assigneeName: active?.employee_name ?? null,
    assignedAt: active?.assigned_at ?? null,
    condition: row.condition,
    notes: row.notes,
    purchaseDate: row.purchase_date,
    purchaseValue: row.purchase_value ? Number(row.purchase_value) : null,
    warrantyExpiresOn: row.warranty_expires_on,
    customValues: (row.custom_values ?? {}) as Record<string, unknown>,
    fieldSchema: (Array.isArray(category?.field_schema)
      ? category.field_schema
      : []) as AssetCategoryField[],
    activeAssignmentId: active?.id ?? null,
    acknowledgedAt: active?.acknowledged_at ?? null,
    assignments: (assignments ?? []).map(mapAssignment),
    openRequests,
  };
}

export async function createAssetRecord(input: {
  name: string;
  categoryId: string;
  serialNumber?: string | null;
  branchId?: string | null;
  condition?: string | null;
  notes?: string | null;
  purchaseDate?: string | null;
  purchaseValue?: string | null;
  warrantyExpiresOn?: string | null;
  customValues: Record<string, unknown>;
  assignedEmployeeId?: string | null;
  issuedAt?: string | null;
}): Promise<string> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: category, error: categoryError } = await supabase
    .from("asset_categories")
    .select("field_schema")
    .eq("id", input.categoryId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (categoryError) throw new Error(categoryError.message);
  if (!category) throw new Error("Category not found.");

  const fieldSchema = (Array.isArray(category.field_schema)
    ? category.field_schema
    : []) as AssetCategoryField[];
  const customValues = validateCustomValues(fieldSchema, input.customValues);

  const status: AssetStatus = "available";

  const { data, error } = await supabase
    .from("assets")
    .insert({
      organization_id: organizationId,
      name: input.name,
      category_id: input.categoryId,
      serial_number: input.serialNumber ?? null,
      branch_id: input.branchId ?? null,
      condition: input.condition ?? null,
      notes: input.notes ?? null,
      purchase_date: input.purchaseDate ?? null,
      purchase_value: input.purchaseValue ?? null,
      warranty_expires_on: input.warrantyExpiresOn ?? null,
      custom_values: customValues,
      status,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logAssetEvent("asset.created", "asset", data.id, { name: input.name });

  if (input.assignedEmployeeId) {
    await assignAsset({
      assetId: data.id,
      employeeId: input.assignedEmployeeId,
      assignedAt: input.issuedAt ?? new Date().toISOString().slice(0, 10),
    });
  }

  return data.id;
}

export async function updateAssetRecord(
  assetId: string,
  input: Omit<Parameters<typeof createAssetRecord>[0], "assignedEmployeeId" | "issuedAt">,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: category, error: categoryError } = await supabase
    .from("asset_categories")
    .select("field_schema")
    .eq("id", input.categoryId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (categoryError) throw new Error(categoryError.message);
  if (!category) throw new Error("Category not found.");

  const fieldSchema = (Array.isArray(category.field_schema)
    ? category.field_schema
    : []) as AssetCategoryField[];
  const customValues = validateCustomValues(fieldSchema, input.customValues);

  const { error } = await supabase
    .from("assets")
    .update({
      name: input.name,
      category_id: input.categoryId,
      serial_number: input.serialNumber ?? null,
      branch_id: input.branchId ?? null,
      condition: input.condition ?? null,
      notes: input.notes ?? null,
      purchase_date: input.purchaseDate ?? null,
      purchase_value: input.purchaseValue ?? null,
      warranty_expires_on: input.warrantyExpiresOn ?? null,
      custom_values: customValues,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
  await logAssetEvent("asset.updated", "asset", assetId);
}

export async function listMyAssets(): Promise<MyAssetRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: assignments, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_at, acknowledged_at, assets(id, name, serial_number, asset_categories(name)), asset_requests(id)",
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .is("returned_at", null)
    .order("assigned_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (assignments ?? []).map((row) => {
    const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
    const category = asset?.asset_categories
      ? Array.isArray(asset.asset_categories)
        ? asset.asset_categories[0]
        : asset.asset_categories
      : null;
    const requests = Array.isArray(row.asset_requests) ? row.asset_requests : [];

    return {
      id: asset?.id ?? "",
      name: asset?.name ?? "Asset",
      categoryName: category?.name ?? "—",
      serialNumber: asset?.serial_number ?? null,
      assignedAt: row.assigned_at,
      acknowledgedAt: row.acknowledged_at,
      hasOpenRequest: requests.length > 0,
    };
  });
}

export async function getMyAssetDetail(assetId: string): Promise<MyAssetDetail | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data: assignment, error } = await supabase
    .from("asset_assignments")
    .select(
      `id, assigned_at, acknowledged_at, notes,
       assets(id, name, serial_number, condition, warranty_expires_on, custom_values, notes,
              asset_categories(name, field_schema)),
       asset_requests(id)`,
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("asset_id", assetId)
    .is("returned_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment) return null;

  const asset = Array.isArray(assignment.assets) ? assignment.assets[0] : assignment.assets;
  if (!asset) return null;

  const category = Array.isArray(asset.asset_categories) ? asset.asset_categories[0] : asset.asset_categories;
  const requests = Array.isArray(assignment.asset_requests) ? assignment.asset_requests : [];

  return {
    id: asset.id,
    name: asset.name,
    categoryName: category?.name ?? "—",
    serialNumber: asset.serial_number,
    assignedAt: assignment.assigned_at,
    acknowledgedAt: assignment.acknowledged_at,
    hasOpenRequest: requests.length > 0,
    condition: asset.condition,
    warrantyExpiresOn: asset.warranty_expires_on,
    customValues: (asset.custom_values ?? {}) as Record<string, unknown>,
    fieldSchema: (Array.isArray(category?.field_schema)
      ? category.field_schema
      : []) as AssetCategoryField[],
    assignmentId: assignment.id,
    notes: asset.notes,
  };
}

export async function listActiveAssignmentsForEmployee(
  employeeId: string,
): Promise<EmployeeAssetAssignmentRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, assigned_at, acknowledged_at, assets(id, name, serial_number, asset_categories(name))",
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .is("returned_at", null)
    .order("assigned_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const asset = Array.isArray(row.assets) ? row.assets[0] : row.assets;
    const category = asset?.asset_categories
      ? Array.isArray(asset.asset_categories)
        ? asset.asset_categories[0]
        : asset.asset_categories
      : null;

    return {
      assignmentId: row.id,
      assetId: asset?.id ?? "",
      assetName: asset?.name ?? "Asset",
      serialNumber: asset?.serial_number ?? null,
      categoryName: category?.name ?? "—",
      assignedAt: row.assigned_at,
      acknowledgedAt: row.acknowledged_at,
    };
  });
}

export async function listAssetAssignments(assetId: string): Promise<AssetAssignmentRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("asset_assignments")
    .select(
      "id, employee_id, employee_name, employee_number, assigned_at, returned_at, acknowledged_at, notes",
    )
    .eq("organization_id", organizationId)
    .eq("asset_id", assetId)
    .order("assigned_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAssignment);
}
