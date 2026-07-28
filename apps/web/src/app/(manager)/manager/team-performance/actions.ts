"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireModule } from "@/lib/entitlements";
import { submitManagerReview } from "@/lib/manager/performance";
import { requireRole } from "@/lib/auth/session";

export async function submitManagerReviewAction(appraisalId: string, formData: FormData): Promise<void> {
  await requireRole("manager");
  await requireModule("performance");
  await submitManagerReview(appraisalId, formData);
  revalidatePath("/manager/team-performance");
  revalidatePath(`/manager/team-performance/${appraisalId}`);
  redirect(`/manager/team-performance/${appraisalId}?submitted=1`);
}
