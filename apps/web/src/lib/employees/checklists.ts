export type ChecklistKind = "onboarding" | "offboarding";

export const CHECKLIST_OWNER_ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "branch_admin", label: "Branch admin" },
  { value: "hr_administrator", label: "HR Administrator" },
  { value: "director", label: "Director" },
  { value: "organization_owner", label: "Organization owner" },
] as const;

export function checklistOwnerLabel(value: string): string | null {
  return CHECKLIST_OWNER_ROLES.find((role) => role.value === value)?.label ?? null;
}

export type ChecklistTemplateItem = {
  title: string;
  ownerLabel: string;
  description?: string;
};

export type EmployeeChecklistTask = {
  id: string;
  kind: ChecklistKind;
  title: string;
  ownerLabel: string;
  description: string;
  done: boolean;
};

export function tasksFromTemplate(
  kind: ChecklistKind,
  items: ChecklistTemplateItem[],
): Array<Omit<EmployeeChecklistTask, "id">> {
  return items
    .map((item) => ({
      kind,
      title: item.title.trim(),
      ownerLabel: item.ownerLabel.trim() || "HR",
      description: item.description?.trim() ?? "",
      done: false,
    }))
    .filter((item) => item.title.length > 0);
}

export function openChecklistTasks(tasks: EmployeeChecklistTask[]): EmployeeChecklistTask[] {
  return tasks.filter((task) => !task.done);
}
