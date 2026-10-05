import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireOrganizationId } from "@/lib/auth/organization-context";
import { createAdminClient } from "@/lib/supabase/admin";
import {
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
    .select("id, kind, title, owner_label, done_at")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .order("created_at");
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind as ChecklistKind,
    title: row.title,
    ownerLabel: row.owner_label,
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
  Array<{ kind: ChecklistKind; items: { id: string; title: string; ownerLabel: string }[] }>
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
        .select("id, template_id, title, owner_label, sort_order")
        .in("template_id", ids)
        .order("sort_order")
    : { data: [], error: null };
  if (itemError) throw new Error(itemError.message);

  return (["onboarding", "offboarding"] as const).map((kind) => {
    const template = (templates ?? []).find((row) => row.kind === kind);
    return {
      kind,
      items: (items ?? [])
        .filter((item) => item.template_id === template?.id)
        .map((item) => ({ id: item.id, title: item.title, ownerLabel: item.owner_label })),
    };
  });
}

export async function addChecklistTemplateItem(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = await requireOrganizationId();
  const kind = String(formData.get("kind") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const ownerLabel = String(formData.get("ownerLabel") ?? "HR").trim() || "HR";
  if (!isKind(kind) || !title) throw new Error("Enter a task title.");

  const templateId = await ensureTemplate(organizationId, kind);
  const admin = createAdminClient();
  const { error } = await admin.from("checklist_template_items").insert({
    organization_id: organizationId,
    template_id: templateId,
    title,
    owner_label: ownerLabel,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/hr/checklists");
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
    .select("title, owner_label")
    .eq("template_id", template.id)
    .order("sort_order");
  if (error) throw new Error(error.message);

  const tasks = tasksFromTemplate(
    kind,
    (items ?? []).map((item) => ({ title: item.title, ownerLabel: item.owner_label })),
  );
  if (tasks.length === 0) throw new Error("Add template tasks before starting this checklist.");

  const { error: insertError } = await admin.from("employee_checklist_tasks").insert(
    tasks.map((task) => ({
      organization_id: organizationId,
      employee_id: employeeId,
      kind: task.kind,
      title: task.title,
      owner_label: task.ownerLabel,
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
