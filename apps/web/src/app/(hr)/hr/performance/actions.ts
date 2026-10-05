"use server";

import { revalidatePath } from "next/cache";

import { closeReviewCycle, createReviewCycle, launchAppraisalsForCycle } from "@/lib/hr/performance";
import {
  createAppraisalTemplate,
  updateAppraisalTemplate,
  cloneAppraisalTemplate,
  deleteAppraisalTemplate,
  setDefaultAppraisalTemplate,
  toggleAppraisalTemplateActive,
} from "@/lib/hr/performance-templates";
import { requireModule } from "@/lib/entitlements";
import { requireRole } from "@/lib/auth/session";

export type HrActionState = { ok: boolean; message: string };

export async function createReviewCycleAction(formData: FormData): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const name = String(formData.get("name") ?? "").trim();
    const periodStart = String(formData.get("periodStart") ?? "");
    const periodEnd = String(formData.get("periodEnd") ?? "");
    const dueDate = String(formData.get("dueDate") ?? "");
    const templateId = String(formData.get("templateId") ?? "").trim() || null;
    const targetDepartmentId = String(formData.get("targetDepartmentId") ?? "").trim() || null;

    if (!name) {
      return { ok: false, message: "Please provide a cycle name." };
    }
    if (!periodStart) {
      return { ok: false, message: "Please provide a period start date." };
    }
    if (!periodEnd) {
      return { ok: false, message: "Please provide a period end date." };
    }
    if (!dueDate) {
      return { ok: false, message: "Please provide a due date." };
    }
    if (periodEnd < periodStart) {
      return { ok: false, message: "Period end date cannot be earlier than period start date." };
    }

    await createReviewCycle({
      name,
      periodStart,
      periodEnd,
      dueDate,
      templateId,
      targetDepartmentId,
    });
    revalidatePath("/hr/performance");
    return { ok: true, message: `Review cycle "${name}" created successfully.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to create review cycle." };
  }
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

export async function saveAppraisalTemplateAction(
  templateId: string | null,
  rawInput: unknown,
): Promise<{ ok: boolean; message: string; templateId?: string }> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    if (templateId) {
      await updateAppraisalTemplate(templateId, rawInput, session.user.id);
      revalidatePath("/hr/performance");
      revalidatePath("/hr/performance/templates");
      return { ok: true, message: "Template updated successfully.", templateId };
    } else {
      const newId = await createAppraisalTemplate(rawInput, session.user.id);
      revalidatePath("/hr/performance");
      revalidatePath("/hr/performance/templates");
      return { ok: true, message: "Template created successfully.", templateId: newId };
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to save template." };
  }
}

export async function cloneAppraisalTemplateAction(templateId: string): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    await cloneAppraisalTemplate(templateId, session.user.id);
    revalidatePath("/hr/performance");
    revalidatePath("/hr/performance/templates");
    return { ok: true, message: "Template cloned successfully." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to clone template." };
  }
}

export async function deleteAppraisalTemplateAction(templateId: string): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    await deleteAppraisalTemplate(templateId, session.user.id);
    revalidatePath("/hr/performance");
    revalidatePath("/hr/performance/templates");
    return { ok: true, message: "Template deleted successfully." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to delete template." };
  }
}

export async function setDefaultAppraisalTemplateAction(templateId: string): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    await setDefaultAppraisalTemplate(templateId, session.user.id);
    revalidatePath("/hr/performance");
    revalidatePath("/hr/performance/templates");
    return { ok: true, message: "Default template updated." };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Failed to set default template." };
  }
}

export async function toggleAppraisalTemplateActiveAction(
  templateId: string,
  isActive: boolean,
): Promise<HrActionState> {
  await requireRole("hr_administrator");
  await requireModule("performance");

  try {
    const session = await requireRole("hr_administrator");
    await toggleAppraisalTemplateActive(templateId, isActive, session.user.id);
    revalidatePath("/hr/performance");
    revalidatePath("/hr/performance/templates");
    return {
      ok: true,
      message: isActive ? "Template activated successfully." : "Template deactivated (retired) successfully.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Failed to update template status.",
    };
  }
}

