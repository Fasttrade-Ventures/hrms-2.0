"use server";

import { updateSpecialistAccess as updateSpecialistAccessService } from "@/lib/employees/specialist-access";

export async function updateSpecialistAccess(formData: FormData): Promise<void> {
  return updateSpecialistAccessService(formData);
}
