import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AssetRow = {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  assigneeName: string | null;
  issuedAt: string | null;
  returnedAt: string | null;
};

export async function listAssets(): Promise<AssetRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assets")
    .select("id, name, category, serial_number, issued_at, returned_at, employees(full_name, email)")
    .eq("organization_id", getOrganizationId())
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const employee = Array.isArray(row.employees) ? row.employees[0] : row.employees;

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      serialNumber: row.serial_number,
      assigneeName:
        (employee as { full_name?: string; email?: string } | null)?.full_name ??
        (employee as { email?: string } | null)?.email ??
        null,
      issuedAt: row.issued_at,
      returnedAt: row.returned_at,
    };
  });
}

export async function createAsset(input: {
  name: string;
  category?: string;
  serialNumber?: string;
  assignedEmployeeId?: string;
  issuedAt?: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();

  const { error } = await supabase.from("assets").insert({
    organization_id: getOrganizationId(),
    name: input.name,
    category: input.category ?? null,
    serial_number: input.serialNumber ?? null,
    assigned_employee_id: input.assignedEmployeeId ?? null,
    issued_at: input.issuedAt ?? null,
  });

  if (error) throw new Error(error.message);
}
