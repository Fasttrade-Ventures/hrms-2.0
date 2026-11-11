import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { announcementBodyHasContent, sanitizeAnnouncementHtml } from "@/lib/announcements/sanitize";
import {
  checklistOwnerLabel,
  openChecklistTasks,
  tasksFromTemplate,
  type ChecklistKind,
  type EmployeeChecklistTask,
} from "@/lib/employees/checklists";

function isKind(value: string): value is ChecklistKind {
  return value === "onboarding" || value === "offboarding";
}

export async function listEmployeeChecklistTasks(employeeId: string): Promise<EmployeeChecklistTask[]> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("employee_checklist_tasks")
    .select("id, kind, title, owner_label, description, done_at")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as ChecklistKind,
    title: row.title,
    ownerLabel: row.owner_label,
    description: row.description ?? "",
    done: Boolean(row.done_at),
  }));
}

export function openTasksForProfile(tasks: EmployeeChecklistTask[]): EmployeeChecklistTask[] {
  return openChecklistTasks(tasks);
}

async function ensureTemplate(organizationId: string, kind: ChecklistKind): Promise<string> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("checklist_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await admin
    .from("checklist_templates")
    .insert({ organization_id: organizationId, kind })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create checklist.");
  return data.id;
}

export async function listChecklistTemplates(): Promise<
  Array<{ kind: ChecklistKind; items: { id: string; title: string; ownerLabel: string; description: string }[] }>
> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();
  const { data: templates, error } = await admin
    .from("checklist_templates")
    .select("id, kind")
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const ids = (templates ?? []).map((row) => row.id);
  const { data: items, error: itemError } = ids.length
    ? await admin
        .from("checklist_template_items")
        .select("id, template_id, title, owner_label, description, sort_order")
        .in("template_id", ids)
        .order("sort_order")
        .order("id")
    : { data: [], error: null };
  if (itemError) throw new Error(itemError.message);

  return (["onboarding", "offboarding"] as const).map((kind) => {
    const template = (templates ?? []).find((row) => row.kind === kind);
    return {
      kind,
      items: (items ?? [])
        .filter((item) => item.template_id === template?.id)
        .map((item) => ({
          id: item.id,
          title: item.title,
          ownerLabel: item.owner_label,
          description: item.description ?? "",
        })),
    };
  });
}

export async function addChecklistTemplateItem(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const ownerLabel = checklistOwnerLabel(String(formData.get("ownerLabel") ?? ""));
  const rawDescription = String(formData.get("description") ?? "");
  const description = announcementBodyHasContent(rawDescription) ? sanitizeAnnouncementHtml(rawDescription) : "";
  if (!isKind(kind) || !title) throw new Error("Enter a task title.");
  if (!ownerLabel) throw new Error("Choose a role.");

  const templateId = await ensureTemplate(organizationId, kind);
  const admin = createAdminClient();
  const { data: last } = await admin
    .from("checklist_template_items")
    .select("sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await admin.from("checklist_template_items").insert({
    organization_id: organizationId,
    template_id: templateId,
    title,
    owner_label: ownerLabel,
    description,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/hr/checklists");
}

export async function removeChecklistTemplateItem(itemId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  if (!itemId) throw new Error("Choose a task to remove.");

  const admin = createAdminClient();
  const { data: item, error: lookupError } = await admin
    .from("checklist_template_items")
    .select("id, title, template_id")
    .eq("id", itemId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (!item) throw new Error("That task is already removed.");

  const { data: template, error: templateError } = await admin
    .from("checklist_templates")
    .select("kind")
    .eq("id", item.template_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);

  const { error } = await admin
    .from("checklist_template_items")
    .delete()
    .eq("id", itemId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const { count, error: countError } = await admin
    .from("checklist_template_items")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("template_id", item.template_id)
    .eq("title", item.title);
  if (countError) throw new Error(countError.message);

  if ((count ?? 0) === 0 && template?.kind) {
    const { error: copyError } = await admin
      .from("employee_checklist_tasks")
      .delete()
      .eq("organization_id", organizationId)
      .eq("kind", template.kind)
      .eq("title", item.title);
    if (copyError) throw new Error(copyError.message);
  }

  revalidatePath("/hr/checklists");
  revalidatePath("/hr/employees", "layout");
}

export async function startEmployeeChecklist(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const employeeId = String(formData.get("employeeId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  if (!employeeId || !isKind(kind)) throw new Error("Choose onboarding or offboarding.");

  const admin = createAdminClient();
  const { data: template } = await admin
    .from("checklist_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .maybeSingle();
  if (!template) throw new Error("Add template tasks before starting this checklist.");

  const { data: items, error } = await admin
    .from("checklist_template_items")
    .select("title, owner_label, description")
    .eq("template_id", template.id)
    .order("sort_order")
    .order("id");
  if (error) throw new Error(error.message);

  const tasks = tasksFromTemplate(
    kind,
    (items ?? []).map((item) => ({
      title: item.title,
      ownerLabel: item.owner_label,
      description: item.description ?? "",
    })),
  );
  if (tasks.length === 0) throw new Error("Add template tasks before starting this checklist.");

  const { error: insertError } = await admin.from("employee_checklist_tasks").insert(
    tasks.map((task) => ({
      organization_id: organizationId,
      employee_id: employeeId,
      kind: task.kind,
      title: task.title,
      owner_label: task.ownerLabel,
      description: task.description,
    })),
  );
  if (insertError) throw new Error(insertError.message);
  revalidatePath(`/hr/employees/${employeeId}`);
}

export async function toggleChecklistTask(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const taskId = String(formData.get("taskId") ?? "");
  const employeeId = String(formData.get("employeeId") ?? "");
  const done = String(formData.get("done") ?? "") === "true";
  const admin = createAdminClient();
  const { error } = await admin
    .from("employee_checklist_tasks")
    .update({ done_at: done ? null : new Date().toISOString() })
    .eq("id", taskId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath(`/hr/employees/${employeeId}`);
}
