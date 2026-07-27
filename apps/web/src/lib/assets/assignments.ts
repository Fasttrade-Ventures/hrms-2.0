import {
  assertAssetStatusTransition,
  assertAssetActionAllowed,
  nextAssetStatusAfterReturn,
  type AssetStatus,
  type AssetAction,
} from "@hrms/domain";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { logAssetEvent } from "./audit";
import { notifyAssetAssigned, notifyAssetReturned } from "./notifications";
import type { ReturnDestination } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function getEmployeeUserId(employeeId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", getOrganizationId())
    .eq("employee_id", employeeId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function assignAsset(input: {
  assetId: string;
  employeeId: string;
  assignedAt: string;
  notes?: string | null;
}): Promise<void> {
  await requireRole("hr_administrator");
  const session = await getSession();
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, name, status")
    .eq("organization_id", organizationId)
    .eq("id", input.assetId)
    .maybeSingle();

  if (assetError) throw new Error(assetError.message);
  if (!asset) throw new Error("Asset not found.");

  const fromStatus = asset.status as AssetStatus;
  const { data: activeAssignment } = await supabase
    .from("asset_assignments")
    .select("id, employee_id")
    .eq("asset_id", input.assetId)
    .is("returned_at", null)
    .maybeSingle();

  const action: AssetAction = activeAssignment ? "reassign" : "assign";
  assertAssetStatusTransition(fromStatus, "assigned", action);

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name, employee_number, email")
    .eq("organization_id", organizationId)
    .eq("id", input.employeeId)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found.");

  const employeeName = employee.full_name ?? employee.email ?? "Unknown employee";

  if (activeAssignment) {
    const { error: closeError } = await supabase
      .from("asset_assignments")
      .update({
        returned_at: input.assignedAt,
        returned_by_user_id: session?.user.id ?? null,
      })
      .eq("id", activeAssignment.id);

    if (closeError) throw new Error(closeError.message);

    if (activeAssignment.employee_id) {
      const prevUserId = await getEmployeeUserId(activeAssignment.employee_id);
      await notifyAssetReturned({
        employeeUserId: prevUserId,
        assetId: asset.id,
        assetName: asset.name,
      });
    }
  }

  const { error: insertError } = await supabase.from("asset_assignments").insert({
    organization_id: organizationId,
    asset_id: input.assetId,
    employee_id: input.employeeId,
    employee_name: employeeName,
    employee_number: employee.employee_number,
    assigned_at: input.assignedAt,
    assigned_by_user_id: session?.user.id ?? null,
    notes: input.notes ?? null,
  });

  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("assets")
    .update({ status: "assigned", updated_at: new Date().toISOString() })
    .eq("id", input.assetId);

  if (updateError) throw new Error(updateError.message);

  const employeeUserId = await getEmployeeUserId(input.employeeId);
  await notifyAssetAssigned({
    employeeUserId,
    assetId: asset.id,
    assetName: asset.name,
  });
  await logAssetEvent("asset.assigned", "asset", input.assetId, {
    employeeId: input.employeeId,
    employeeName,
  });
}

export async function returnAssetAssignment(input: {
  assignmentId: string;
  returnedAt: string;
  destination: ReturnDestination;
  notes?: string | null;
}): Promise<void> {
  await requireRole("hr_administrator");
  const session = await getSession();
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: assignment, error: assignmentError } = await supabase
    .from("asset_assignments")
    .select("id, asset_id, employee_id, returned_at, assets(name, status)")
    .eq("organization_id", organizationId)
    .eq("id", input.assignmentId)
    .maybeSingle();

  if (assignmentError) throw new Error(assignmentError.message);
  if (!assignment) throw new Error("Assignment not found.");
  if (assignment.returned_at) throw new Error("Assignment already returned.");

  const asset = Array.isArray(assignment.assets) ? assignment.assets[0] : assignment.assets;
  if (!asset) throw new Error("Asset not found.");

  assertAssetActionAllowed(asset.status as AssetStatus, "return");
  const nextStatus = nextAssetStatusAfterReturn(input.destination);

  const { error: closeError } = await supabase
    .from("asset_assignments")
    .update({
      returned_at: input.returnedAt,
      returned_by_user_id: session?.user.id ?? null,
      notes: input.notes ?? null,
    })
    .eq("id", input.assignmentId);

  if (closeError) throw new Error(closeError.message);

  const { error: assetError } = await supabase
    .from("assets")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", assignment.asset_id);

  if (assetError) throw new Error(assetError.message);

  if (assignment.employee_id) {
    const employeeUserId = await getEmployeeUserId(assignment.employee_id);
    await notifyAssetReturned({
      employeeUserId,
      assetId: assignment.asset_id,
      assetName: asset.name,
    });
  }

  await logAssetEvent("asset.returned", "asset", assignment.asset_id, {
    assignmentId: input.assignmentId,
    destination: input.destination,
  });
}

export async function disposeAsset(assetId: string): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select("id, status")
    .eq("organization_id", organizationId)
    .eq("id", assetId)
    .maybeSingle();

  if (assetError) throw new Error(assetError.message);
  if (!asset) throw new Error("Asset not found.");

  assertAssetStatusTransition(asset.status as AssetStatus, "disposed", "dispose");

  const { data: activeAssignment } = await supabase
    .from("asset_assignments")
    .select("id")
    .eq("asset_id", assetId)
    .is("returned_at", null)
    .maybeSingle();

  if (activeAssignment) {
    throw new Error("Return the asset before disposing.");
  }

  const { error } = await supabase
    .from("assets")
    .update({ status: "disposed", updated_at: new Date().toISOString() })
    .eq("id", assetId);

  if (error) throw new Error(error.message);
  await logAssetEvent("asset.disposed", "asset", assetId);
}

export async function acknowledgeAssignment(assignmentId: string, employeeId: string): Promise<void> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: assignment, error } = await supabase
    .from("asset_assignments")
    .select("id, asset_id, acknowledged_at")
    .eq("organization_id", organizationId)
    .eq("id", assignmentId)
    .eq("employee_id", employeeId)
    .is("returned_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment) throw new Error("Assignment not found.");
  if (assignment.acknowledged_at) return;

  const { error: updateError } = await supabase
    .from("asset_assignments")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", assignmentId);

  if (updateError) throw new Error(updateError.message);
  await logAssetEvent("asset.acknowledged", "asset", assignment.asset_id, { assignmentId });
}
