import {
  createRequisitionSchema,
  updateRequisitionSchema,
  type CreateRequisitionInput,
  type UpdateRequisitionInput,
} from "@hrms/validation";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrganizationId } from "@/lib/auth/organization-context";

import { canTransitionRequisitionStatus, type RequisitionStatus } from "./requisition-status";
import { TERMINAL_STAGES } from "./types";

export type RequisitionListItem = {
  id: string;
  title: string;
  status: RequisitionStatus;
  headcount: number;
  employmentType: string | null;
  departmentId: string | null;
  branchId: string | null;
  departmentName?: string;
  branchName?: string;
  description: string | null;
  hiredCount: number;
  openPipelineCount: number;
  createdAt: string;
};

export type RequisitionDetail = RequisitionListItem & {
  description: string | null;
};

type RequisitionRow = {
  id: string;
  title: string;
  status: string;
  headcount: number;
  employment_type: string | null;
  department_id: string | null;
  branch_id: string | null;
  description?: string | null;
  created_at: string;
  departments: { name: string } | { name: string }[] | null;
  branches: { name: string } | { name: string }[] | null;
};

function relationName(
  relation: { name: string } | { name: string }[] | null | undefined,
): string | undefined {
  if (!relation) return undefined;
  const row = Array.isArray(relation) ? relation[0] : relation;
  return row?.name ?? undefined;
}

function mapRequisitionRow(
  row: RequisitionRow,
  counts: { hiredCount: number; openPipelineCount: number },
): RequisitionListItem {
  return {
    id: row.id,
    title: row.title,
    status: row.status as RequisitionStatus,
    headcount: row.headcount,
    employmentType: row.employment_type,
    departmentId: row.department_id,
    branchId: row.branch_id,
    departmentName: relationName(row.departments),
    branchName: relationName(row.branches),
    description: row.description ?? null,
    hiredCount: counts.hiredCount,
    openPipelineCount: counts.openPipelineCount,
    createdAt: row.created_at,
  };
}

async function loadApplicationCountsByRequisition(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  requisitionIds: string[],
): Promise<Map<string, { hiredCount: number; openPipelineCount: number }>> {
  const counts = new Map<string, { hiredCount: number; openPipelineCount: number }>();
  for (const id of requisitionIds) {
    counts.set(id, { hiredCount: 0, openPipelineCount: 0 });
  }
  if (requisitionIds.length === 0) return counts;

  const { data, error } = await admin
    .from("job_applications")
    .select("requisition_id, stage")
    .eq("organization_id", organizationId)
    .in("requisition_id", requisitionIds);

  if (error) throw new Error(error.message);

  const terminal = new Set<string>(TERMINAL_STAGES);
  for (const app of data ?? []) {
    const bucket = counts.get(app.requisition_id);
    if (!bucket) continue;
    if (app.stage === "hired") bucket.hiredCount += 1;
    if (!terminal.has(app.stage)) bucket.openPipelineCount += 1;
  }
  return counts;
}

export async function createRequisition(
  input: CreateRequisitionInput,
  createdByUserId: string,
): Promise<{ requisitionId: string }> {
  const parsed = createRequisitionSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("job_requisitions")
    .insert({
      organization_id: organizationId,
      title: parsed.title.trim(),
      description: parsed.description?.trim() ?? null,
      headcount: parsed.headcount,
      department_id: parsed.departmentId ?? null,
      branch_id: parsed.branchId ?? null,
      employment_type: parsed.employmentType ?? null,
      status: "open",
      created_by: createdByUserId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create requisition.");
  return { requisitionId: data.id };
}

export async function listRequisitions(): Promise<RequisitionListItem[]> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("job_requisitions")
    .select(
      "id, title, status, headcount, employment_type, department_id, branch_id, description, created_at, departments(name), branches(name)",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as RequisitionRow[];
  const counts = await loadApplicationCountsByRequisition(
    admin,
    organizationId,
    rows.map((row) => row.id),
  );

  return rows.map((row) =>
    mapRequisitionRow(row, counts.get(row.id) ?? { hiredCount: 0, openPipelineCount: 0 }),
  );
}

export async function getRequisition(id: string): Promise<RequisitionDetail | null> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("job_requisitions")
    .select(
      "id, title, status, headcount, employment_type, department_id, branch_id, description, created_at, departments(name), branches(name)",
    )
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as RequisitionRow;
  const counts = await loadApplicationCountsByRequisition(admin, organizationId, [id]);
  const base = mapRequisitionRow(row, counts.get(id) ?? { hiredCount: 0, openPipelineCount: 0 });

  return { ...base, description: row.description ?? null };
}

export async function updateRequisition(
  input: UpdateRequisitionInput,
  _actorUserId: string,
): Promise<void> {
  const parsed = updateRequisitionSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: row, error: fetchError } = await admin
    .from("job_requisitions")
    .select("id, status")
    .eq("id", parsed.requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error("Requisition not found.");
  if (row.status === "closed") {
    throw new Error("Closed requisitions cannot be edited.");
  }

  const { error } = await admin
    .from("job_requisitions")
    .update({
      title: parsed.title.trim(),
      description: parsed.description?.trim() ?? null,
      headcount: parsed.headcount,
      department_id: parsed.departmentId ?? null,
      branch_id: parsed.branchId ?? null,
      employment_type: parsed.employmentType ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.requisitionId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

export async function setRequisitionStatus(
  requisitionId: string,
  toStatus: RequisitionStatus,
  _actorUserId: string,
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: row, error: fetchError } = await admin
    .from("job_requisitions")
    .select("id, status")
    .eq("id", requisitionId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error("Requisition not found.");
  if (!canTransitionRequisitionStatus(row.status as RequisitionStatus, toStatus)) {
    throw new Error(`Cannot change status from ${row.status} to ${toStatus}.`);
  }

  const { error } = await admin
    .from("job_requisitions")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", requisitionId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}
