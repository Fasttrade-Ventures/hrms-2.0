import { tasksFromTemplate, type ChecklistKind } from "@/lib/employees/checklists";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingChecklistSkipReason = "no_template" | "no_tasks" | "already_started";

export function onboardingChecklistSkipMessage(reason: OnboardingChecklistSkipReason): string {
  switch (reason) {
    case "no_template":
      return "Add an onboarding checklist template, then ask HR to send activation.";
    case "no_tasks":
      return "Add tasks to the onboarding checklist template, then ask HR to send activation.";
    case "already_started":
      return "Onboarding checklist was already started for this employee.";
  }
}

export async function tryStartOnboardingChecklist(
  organizationId: string,
  employeeId: string,
): Promise<{ started: boolean; reason?: OnboardingChecklistSkipReason }> {
  const admin = createAdminClient();
  const kind: ChecklistKind = "onboarding";

  const { data: existingTask, error: existingError } = await admin
    .from("employee_checklist_tasks")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("kind", kind)
    .limit(1)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existingTask) return { started: false, reason: "already_started" };

  const { data: template, error: templateError } = await admin
    .from("checklist_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("kind", kind)
    .maybeSingle();
  if (templateError) throw new Error(templateError.message);
  if (!template) return { started: false, reason: "no_template" };

  const { data: items, error: itemsError } = await admin
    .from("checklist_template_items")
    .select("title, owner_label, description")
    .eq("template_id", template.id)
    .order("sort_order")
    .order("id");
  if (itemsError) throw new Error(itemsError.message);

  const tasks = tasksFromTemplate(
    kind,
    (items ?? []).map((item) => ({
      title: item.title,
      ownerLabel: item.owner_label,
      description: item.description ?? "",
    })),
  );
  if (tasks.length === 0) return { started: false, reason: "no_tasks" };

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

  return { started: true };
}
