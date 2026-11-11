"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import {
  closePulseSurveyRun,
  openPulseSurveyRun,
  setPulseSurveyPublicLink,
} from "@/lib/hr/pulse-survey-runs";
import {
  createPulseSurveyTemplate,
  deletePulseSurveyTemplate,
  setPulseSurveyTemplateActive,
  updatePulseSurveyTemplate,
} from "@/lib/hr/pulse-survey-templates";

async function actorId() {
  const session = await requireRole("hr_administrator");
  return session.user.id;
}

export async function savePulseTemplateAction(input: {
  templateId?: string;
  payload: unknown;
}): Promise<{ ok: true; templateId: string } | { ok: false; error: string }> {
  try {
    await requireModule("performance");
    const userId = await actorId();
    if (input.templateId) {
      await updatePulseSurveyTemplate(input.templateId, input.payload, userId);
      revalidatePath("/hr/pulse");
      return { ok: true, templateId: input.templateId };
    }
    const templateId = await createPulseSurveyTemplate(input.payload, userId);
    revalidatePath("/hr/pulse");
    return { ok: true, templateId };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not save template." };
  }
}

export async function setPulseTemplateActiveAction(templateId: string, isActive: boolean) {
  await requireModule("performance");
  await setPulseSurveyTemplateActive(templateId, isActive);
  revalidatePath("/hr/pulse");
}

export async function deletePulseTemplateAction(templateId: string) {
  await requireModule("performance");
  await deletePulseSurveyTemplate(templateId);
  revalidatePath("/hr/pulse");
}

export async function openPulseSurveyAction(formData: FormData) {
  await requireModule("performance");
  const userId = await actorId();
  const targetRoles = formData.getAll("targetRoles").map(String).filter(Boolean);
  const targetDepartmentIds = formData.getAll("targetDepartmentIds").map(String).filter(Boolean);
  const branchId = String(formData.get("branchId") ?? "").trim() || null;
  const publicLinkEnabled = formData.get("publicLinkEnabled") === "on";

  await openPulseSurveyRun(
    {
      templateId: String(formData.get("templateId") ?? ""),
      opensOn: String(formData.get("opensOn") ?? ""),
      closesOn: String(formData.get("closesOn") ?? ""),
      branchId,
      targetRoles,
      targetDepartmentIds,
      publicLinkEnabled,
    },
    userId,
  );
  revalidatePath("/hr/pulse");
}

export async function closePulseSurveyAction(formData: FormData) {
  await requireModule("performance");
  const userId = await actorId();
  await closePulseSurveyRun(String(formData.get("runId") ?? ""), userId);
  revalidatePath("/hr/pulse");
}

export async function togglePulsePublicLinkAction(formData: FormData) {
  await requireModule("performance");
  const runId = String(formData.get("runId") ?? "");
  const enabled = formData.get("enabled") === "1";
  await setPulseSurveyPublicLink(runId, enabled);
  revalidatePath("/hr/pulse");
  revalidatePath(`/hr/pulse/runs/${runId}`);
}
