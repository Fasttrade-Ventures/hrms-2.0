export type ChecklistKind = "onboarding" | "offboarding";

export type ChecklistTemplateItem = {
  title: string;
  ownerLabel: string;
};

export type EmployeeChecklistTask = {
  id: string;
  kind: ChecklistKind;
  title: string;
  ownerLabel: string;
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
      done: false,
    }))
    .filter((item) => item.title.length > 0);
}

export function openChecklistTasks(tasks: EmployeeChecklistTask[]): EmployeeChecklistTask[] {
  return tasks.filter((task) => !task.done);
}
