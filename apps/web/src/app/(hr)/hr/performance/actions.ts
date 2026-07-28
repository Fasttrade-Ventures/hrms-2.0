"use server";

import { revalidatePath } from "next/cache";

import { closeReviewCycle, createReviewCycle, launchAppraisalsForCycle } from "@/lib/hr/performance";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

export type HrActionState = { ok: boolean; message: string };

export async function createReviewCycleFormAction(formData: FormData): Promise<void> {
  await requireRole("hr_administrator");

  const name = String(formData.get("name") ?? "").trim();
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");

  if (!name || !periodStart || !periodEnd || !dueDate) {
    throw new Error("All fields are required.");
  }

  await createReviewCycle({ name, periodStart, periodEnd, dueDate });
  revalidatePath("/hr/performance");
}

export async function launchAppraisalsAction(cycleId: string): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    const count = await launchAppraisalsForCycle(cycleId, session.user.id);
    revalidatePath("/hr/performance");
    return { ok: true, message: `Launched ${count} appraisals.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to launch appraisals." };
  }
}

export async function closeReviewCycleAction(cycleId: string): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    await closeReviewCycle(cycleId, session.user.id);
    revalidatePath("/hr/performance");
    return { ok: true, message: "Review cycle closed." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to close review cycle." };
  }
}
