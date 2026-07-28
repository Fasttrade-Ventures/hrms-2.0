"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addCandidateSchema,
  createOfferSchema,
  createRequisitionSchema,
  moveStageSchema,
} from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { addCandidateToRequisition } from "@/lib/recruitment/applications";
import { acceptOffer, createOfferForApplication, moveApplicationStage } from "@/lib/recruitment/offers";
import { createRequisition } from "@/lib/recruitment/requisitions";
import { createAdminClient } from "@/lib/supabase/admin";

export type RecruitmentActionState = {
  error?: string;
  success?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

async function getOrganizationName(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select("name")
    .eq("id", getOrganizationId())
    .maybeSingle();
  return data?.name ?? "Organization";
}

export async function createRequisitionAction(
  _prev: RecruitmentActionState,
  formData: FormData,
): Promise<RecruitmentActionState> {
  try {
    await requireModule("recruitment");
    const session = await requireRole("hr_administrator");
    const parsed = createRequisitionSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || undefined,
      headcount: formData.get("headcount") || 1,
      departmentId: formData.get("departmentId") || null,
      branchId: formData.get("branchId") || null,
      employmentType: formData.get("employmentType") || null,
    });

    const { requisitionId } = await createRequisition(parsed, session.user.id);
    revalidatePath("/hr/recruitment");
    redirect(`/hr/recruitment/${requisitionId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to create requisition." };
  }
}

export async function addCandidateAction(
  _prev: RecruitmentActionState,
  formData: FormData,
): Promise<RecruitmentActionState> {
  try {
    await requireModule("recruitment");
    await requireRole("hr_administrator");
    const parsed = addCandidateSchema.parse({
      requisitionId: formData.get("requisitionId"),
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      phone: formData.get("phone") || null,
    });

    await addCandidateToRequisition(parsed);
    revalidatePath(`/hr/recruitment/${parsed.requisitionId}`);
    return { success: "Candidate added." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add candidate." };
  }
}

export async function moveStageAction(
  _prev: RecruitmentActionState,
  formData: FormData,
): Promise<RecruitmentActionState> {
  try {
    await requireModule("recruitment");
    const session = await requireRole("hr_administrator");
    const parsed = moveStageSchema.parse({
      applicationId: formData.get("applicationId"),
      toStage: formData.get("toStage"),
      notes: formData.get("notes") || undefined,
    });

    await moveApplicationStage({
      applicationId: parsed.applicationId,
      toStage: parsed.toStage,
      actorUserId: session.user.id,
      notes: parsed.notes,
    });

    const requisitionId = String(formData.get("requisitionId") ?? "");
    if (requisitionId) revalidatePath(`/hr/recruitment/${requisitionId}`);
    return { success: "Stage updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to move stage." };
  }
}

export async function createOfferAction(
  _prev: RecruitmentActionState,
  formData: FormData,
): Promise<RecruitmentActionState> {
  try {
    await requireModule("recruitment");
    const session = await requireRole("hr_administrator");
    const parsed = createOfferSchema.parse({
      applicationId: formData.get("applicationId"),
      jobTitle: formData.get("jobTitle"),
      basicSalary: formData.get("basicSalary"),
      startDate: formData.get("startDate"),
    });

    await createOfferForApplication({
      ...parsed,
      organizationName: await getOrganizationName(),
      actorUserId: session.user.id,
    });

    const requisitionId = String(formData.get("requisitionId") ?? "");
    if (requisitionId) revalidatePath(`/hr/recruitment/${requisitionId}`);
    return { success: "Offer created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create offer." };
  }
}

export async function acceptOfferAction(
  _prev: RecruitmentActionState,
  formData: FormData,
): Promise<RecruitmentActionState> {
  try {
    await requireModule("recruitment");
    const session = await requireRole("hr_administrator");
    const offerId = String(formData.get("offerId") ?? "");
    if (!offerId) return { error: "Offer ID is required." };

    const { employeeId } = await acceptOffer(offerId, session.user.id);
    const requisitionId = String(formData.get("requisitionId") ?? "");
    if (requisitionId) revalidatePath(`/hr/recruitment/${requisitionId}`);
    redirect(`/hr/employees/${employeeId}/edit?hired=1`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to accept offer." };
  }
}
