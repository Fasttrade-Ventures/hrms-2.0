"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { createAsset } from "@/lib/hr/assets";
import { createDraftPayrun, lockPayrun } from "@/lib/hr/payroll";

export type HrActionState = {
  error?: string;
  success?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function createAssetAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || undefined;
  const serialNumber = String(formData.get("serialNumber") ?? "").trim() || undefined;
  const assignedEmployeeId = String(formData.get("assignedEmployeeId") ?? "").trim() || undefined;
  const issuedAt = String(formData.get("issuedAt") ?? "").trim() || undefined;

  if (!name) return { error: "Asset name is required." };

  try {
    requireModule("assets");
    await requireRole("hr_administrator");
    await createAsset({ name, category, serialNumber, assignedEmployeeId, issuedAt });
    revalidatePath("/hr/assets");
    return { success: "Asset created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create asset." };
  }
}

export async function createPayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const periodYear = Number(formData.get("periodYear"));
  const periodMonth = Number(formData.get("periodMonth"));
  const earningPeriodStart = String(formData.get("earningPeriodStart") ?? "");
  const earningPeriodEnd = String(formData.get("earningPeriodEnd") ?? "");

  if (!periodYear || !periodMonth || !earningPeriodStart || !earningPeriodEnd) {
    return { error: "All payrun fields are required." };
  }

  try {
    requireModule("payroll");
    await requireRole("hr_administrator");
    const payrunId = await createDraftPayrun({
      periodYear,
      periodMonth,
      earningPeriodStart,
      earningPeriodEnd,
    });
    revalidatePath("/hr/payroll");
    return { success: `Draft payrun created (${payrunId.slice(0, 8)}…).` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create payrun." };
  }
}

export async function lockPayrunAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  const payrunId = String(formData.get("payrunId") ?? "");
  if (!payrunId) return { error: "Missing payrun." };

  try {
    requireModule("payroll");
    const session = await requireRole("hr_administrator");
    await lockPayrun(payrunId, session.user.id);
    revalidatePath("/hr/payroll");
    revalidatePath(`/hr/payroll/${payrunId}`);
    return { success: "Payrun locked." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to lock payrun." };
  }
}
