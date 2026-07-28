"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { submitSelfAppraisal } from "@/lib/employee/performance";
import { requireModule } from "@/lib/entitlements";

export async function submitSelfAppraisalAction(appraisalId: string, formData: FormData): Promise<void> {
  await requireModule("performance");
  await submitSelfAppraisal(appraisalId, formData);
  revalidatePath("/employee/performance");
  revalidatePath(`/employee/performance/${appraisalId}`);
  redirect(`/employee/performance/${appraisalId}?submitted=1`);
}
