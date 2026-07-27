import { requireEmployeeContext } from "@/lib/employee/leave";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

import { logAssetEvent } from "./audit";
import { notifyAssetRequestToHr } from "./notifications";
import type { AssetRequestKind } from "./types";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function createAssetRequest(input: {
  assetId: string;
  employeeId: string;
  kind: AssetRequestKind;
  message?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data: assignment, error: assignmentError } = await supabase
    .from("asset_assignments")
    .select("id, employee_id, employees(full_name)")
    .eq("organization_id", organizationId)
    .eq("asset_id", input.assetId)
    .eq("employee_id", input.employeeId)
    .is("returned_at", null)
    .maybeSingle();

  if (assignmentError) throw new Error(assignmentError.message);
  if (!assignment) throw new Error("You do not have an active assignment for this asset.");

  const { data: existing } = await supabase
    .from("asset_requests")
    .select("id")
    .eq("asset_id", input.assetId)
    .eq("employee_id", input.employeeId)
    .eq("kind", input.kind)
    .eq("status", "open")
    .maybeSingle();

  if (existing) throw new Error("You already have an open request of this type.");

  const { data: asset } = await supabase
    .from("assets")
    .select("name")
    .eq("id", input.assetId)
    .maybeSingle();

  const { data: request, error } = await supabase
    .from("asset_requests")
    .insert({
      organization_id: organizationId,
      asset_id: input.assetId,
      assignment_id: assignment.id,
      employee_id: input.employeeId,
      kind: input.kind,
      message: input.message ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const employee = Array.isArray(assignment.employees) ? assignment.employees[0] : assignment.employees;
  const employeeName = (employee as { full_name?: string } | null)?.full_name ?? "Employee";

  await notifyAssetRequestToHr({
    assetId: input.assetId,
    assetName: asset?.name ?? "Asset",
    employeeName,
    kind: input.kind,
    requestId: request.id,
  });
  await logAssetEvent("asset.request.created", "asset_request", request.id, {
    assetId: input.assetId,
    kind: input.kind,
  });
}

export async function resolveAssetRequest(requestId: string): Promise<void> {
  const session = await requireRole("hr_administrator");
  const supabase = await createClient();

  const organizationId = getOrganizationId();

  const { error } = await supabase
    .from("asset_requests")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: session.user.id,
    })
    .eq("organization_id", organizationId)
    .eq("id", requestId)
    .eq("status", "open");

  if (error) throw new Error(error.message);
  await logAssetEvent("asset.request.resolved", "asset_request", requestId);
}

export async function createMyAssetRequest(input: {
  assetId: string;
  kind: AssetRequestKind;
  message?: string | null;
}): Promise<void> {
  const { employeeId } = await requireEmployeeContext();
  await createAssetRequest({ ...input, employeeId });
}
