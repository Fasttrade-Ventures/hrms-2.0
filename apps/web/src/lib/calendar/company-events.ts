import type { CompanyEventFormInput } from "@hrms/validation";

import { logAuditEvent } from "@/lib/audit/log-event";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function createCompanyEvent(input: {
  form: CompanyEventFormInput;
  actorUserId: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_events")
    .insert({
      organization_id: organizationId,
      title: input.form.title,
      description: input.form.description ?? null,
      kind: input.form.kind,
      start_date: input.form.startDate,
      end_date: input.form.endDate,
      branch_id: input.form.branchId ?? null,
      target_department_ids: input.form.targetDepartmentIds,
      created_by_user_id: input.actorUserId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: input.actorUserId,
    action: "company_event.created",
    resourceType: "company_event",
    resourceId: data.id,
    metadata: { title: input.form.title },
  });
}

export async function updateCompanyEvent(input: {
  eventId: string;
  form: CompanyEventFormInput;
  actorUserId: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_events")
    .update({
      title: input.form.title,
      description: input.form.description ?? null,
      kind: input.form.kind,
      start_date: input.form.startDate,
      end_date: input.form.endDate,
      branch_id: input.form.branchId ?? null,
      target_department_ids: input.form.targetDepartmentIds,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("id", input.eventId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: input.actorUserId,
    action: "company_event.updated",
    resourceType: "company_event",
    resourceId: input.eventId,
    metadata: { title: input.form.title },
  });
}

export async function deleteCompanyEvent(input: {
  eventId: string;
  actorUserId: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("company_events")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", input.eventId);

  if (error) throw new Error(error.message);

  await logAuditEvent({
    actorUserId: input.actorUserId,
    action: "company_event.deleted",
    resourceType: "company_event",
    resourceId: input.eventId,
  });
}
