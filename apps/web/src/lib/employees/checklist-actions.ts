"use server";

import {
  addChecklistTemplateItem as addChecklistTemplateItemService,
  removeChecklistTemplateItem as removeChecklistTemplateItemService,
  startEmployeeChecklist as startEmployeeChecklistService,
  toggleChecklistTask as toggleChecklistTaskService,
} from "@/lib/employees/checklist-service";

export async function addChecklistTemplateItem(formData: FormData): Promise<void> {
  return addChecklistTemplateItemService(formData);
}

export async function removeChecklistTemplateItem(itemId: string): Promise<void> {
  return removeChecklistTemplateItemService(itemId);
}

export async function startEmployeeChecklist(formData: FormData): Promise<void> {
  return startEmployeeChecklistService(formData);
}

export async function toggleChecklistTask(formData: FormData): Promise<void> {
  return toggleChecklistTaskService(formData);
}
