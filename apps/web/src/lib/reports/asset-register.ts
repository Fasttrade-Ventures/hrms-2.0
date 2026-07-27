import { createClient } from "@/lib/supabase/server";

import { paginateRows } from "./context";
import type { ReportFilters } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AssetRegisterReportRow = Record<string, string | number | null>;

export async function listAssetRegisterRows(filters: ReportFilters): Promise<{
  columns: { key: string; label: string }[];
  rows: AssetRegisterReportRow[];
  total: number;
}> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  let query = supabase
    .from("assets")
    .select(
      "id, name, serial_number, status, purchase_value, warranty_expires_on, asset_categories(name), branches(name)",
    )
    .eq("organization_id", organizationId)
    .order("name");

  if (filters.assetStatus) query = query.eq("status", filters.assetStatus);
  if (filters.assetCategoryId) query = query.eq("category_id", filters.assetCategoryId);
  if (filters.branchId) query = query.eq("branch_id", filters.branchId);

  const { data: assets, error } = await query.limit(5000);
  if (error) throw new Error(error.message);

  const assetIds = (assets ?? []).map((row) => row.id);
  const { data: assignments } = assetIds.length
    ? await supabase
        .from("asset_assignments")
        .select("asset_id, employee_name, employee_number")
        .eq("organization_id", organizationId)
        .in("asset_id", assetIds)
        .is("returned_at", null)
    : { data: [] };

  const assigneeByAsset = new Map(
    (assignments ?? []).map((row) => [
      row.asset_id,
      `${row.employee_name}${row.employee_number ? ` (${row.employee_number})` : ""}`,
    ]),
  );

  const q = filters.employeeQuery?.toLowerCase();
  let flatRows: AssetRegisterReportRow[] = (assets ?? []).map((row) => ({
    name: row.name,
    category: (row.asset_categories as { name?: string } | null)?.name ?? null,
    serialNumber: row.serial_number,
    status: row.status,
    assignee: assigneeByAsset.get(row.id) ?? "Unassigned",
    branch: (row.branches as { name?: string } | null)?.name ?? null,
    purchaseValue: row.purchase_value,
    warrantyExpiry: row.warranty_expires_on,
  }));

  if (q) {
    flatRows = flatRows.filter((row) => {
      const assignee = String(row.assignee ?? "").toLowerCase();
      const name = String(row.name ?? "").toLowerCase();
      const serial = String(row.serialNumber ?? "").toLowerCase();
      return assignee.includes(q) || name.includes(q) || serial.includes(q);
    });
  }

  const { rows, total } = paginateRows(flatRows, filters);
  return {
    columns: [
      { key: "name", label: "Asset" },
      { key: "category", label: "Category" },
      { key: "serialNumber", label: "Serial" },
      { key: "status", label: "Status" },
      { key: "assignee", label: "Assignee" },
      { key: "branch", label: "Branch" },
      { key: "purchaseValue", label: "Value (RM)" },
      { key: "warrantyExpiry", label: "Warranty expiry" },
    ],
    rows,
    total,
  };
}
