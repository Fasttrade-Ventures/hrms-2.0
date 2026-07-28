"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  assignAssetSchema,
  createAssetSchema,
  returnAssetSchema,
  updateAssetSchema,
  assetRequestSchema,
} from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { assignAsset, returnAssetAssignment, disposeAsset, acknowledgeAssignment } from "@/lib/assets/assignments";
import { getAssetCategory } from "@/lib/assets/categories";
import { createAssetRecord, updateAssetRecord } from "@/lib/assets/queries";
import { createMyAssetRequest, resolveAssetRequest } from "@/lib/assets/requests";

export type HrActionState = {
  error?: string;
  success?: string;
};

function readOptional(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value || null;
}

function parseCustomValues(formData: FormData): Record<string, unknown> {
  const raw = String(formData.get("customValuesJson") ?? "{}");
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readCustomValuesForCategory(
  formData: FormData,
  categoryId: string,
): Promise<Record<string, unknown>> {
  const category = await getAssetCategory(categoryId);
  if (!category) return {};

  const values: Record<string, unknown> = {};
  for (const field of category.fieldSchema) {
    const raw = String(formData.get(`custom_${field.key}`) ?? "").trim();
    if (!raw) continue;
    values[field.key] = field.type === "number" ? Number(raw) : raw;
  }
  return values;
}

function formatZodError(error: { issues: Array<{ path: (string | number)[]; message: string }> }): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid asset details.";
  const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
  return `${path}${issue.message}`;
}

export async function createAssetAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");

    const parsed = createAssetSchema.safeParse({
      name: String(formData.get("name") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "").trim(),
      serialNumber: readOptional(formData, "serialNumber"),
      branchId: readOptional(formData, "branchId"),
      condition: readOptional(formData, "condition"),
      notes: readOptional(formData, "notes"),
      purchaseDate: readOptional(formData, "purchaseDate"),
      purchaseValue: readOptional(formData, "purchaseValue"),
      warrantyExpiresOn: readOptional(formData, "warrantyExpiresOn"),
      customValuesJson: String(formData.get("customValuesJson") ?? "{}"),
      assignedEmployeeId: readOptional(formData, "assignedEmployeeId"),
      issuedAt: readOptional(formData, "issuedAt"),
    });

    if (!parsed.success) {
      return { error: formatZodError(parsed.error) };
    }

    const customValues = await readCustomValuesForCategory(formData, parsed.data.categoryId);
    const { customValuesJson, ...assetInput } = parsed.data;
    void customValuesJson;

    const assetId = await createAssetRecord({
      ...assetInput,
      customValues,
    });

    revalidatePath("/hr/assets");
    redirect(`/hr/assets/${assetId}`);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to create asset." };
  }
}

export async function updateAssetAction(
  assetId: string,
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");

    const parsed = updateAssetSchema.safeParse({
      name: String(formData.get("name") ?? "").trim(),
      categoryId: String(formData.get("categoryId") ?? "").trim(),
      serialNumber: readOptional(formData, "serialNumber"),
      branchId: readOptional(formData, "branchId"),
      condition: readOptional(formData, "condition"),
      notes: readOptional(formData, "notes"),
      purchaseDate: readOptional(formData, "purchaseDate"),
      purchaseValue: readOptional(formData, "purchaseValue"),
      warrantyExpiresOn: readOptional(formData, "warrantyExpiresOn"),
      customValuesJson: String(formData.get("customValuesJson") ?? "{}"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid asset details." };
    }

    await updateAssetRecord(assetId, {
      ...parsed.data,
      customValues: parseCustomValues(formData),
    });

    revalidatePath("/hr/assets");
    revalidatePath(`/hr/assets/${assetId}`);
    return { success: "Asset updated." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update asset." };
  }
}

export async function assignAssetAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");

    const parsed = assignAssetSchema.safeParse({
      assetId: String(formData.get("assetId") ?? "").trim(),
      employeeId: String(formData.get("employeeId") ?? "").trim(),
      assignedAt: String(formData.get("assignedAt") ?? "").trim(),
      notes: readOptional(formData, "notes"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid assignment details." };
    }

    await assignAsset(parsed.data);
    revalidatePath("/hr/assets");
    revalidatePath(`/hr/assets/${parsed.data.assetId}`);
    return { success: "Asset assigned." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to assign asset." };
  }
}

export async function returnAssetAction(
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");

    const parsed = returnAssetSchema.safeParse({
      assignmentId: String(formData.get("assignmentId") ?? "").trim(),
      returnedAt: String(formData.get("returnedAt") ?? "").trim(),
      destination: String(formData.get("destination") ?? "to_inventory").trim(),
      notes: readOptional(formData, "notes"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid return details." };
    }

    await returnAssetAssignment(parsed.data);

    const redirectTo = readOptional(formData, "redirectTo");
    revalidatePath("/hr/assets");
    if (redirectTo) revalidatePath(redirectTo);
    return { success: "Asset returned." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to return asset." };
  }
}

export async function disposeAssetAction(
  assetId: string,
  prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  void prev;
  void formData;
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");
    await disposeAsset(assetId);
    revalidatePath("/hr/assets");
    revalidatePath(`/hr/assets/${assetId}`);
    return { success: "Asset disposed." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to dispose asset." };
  }
}

export async function resolveAssetRequestAction(
  requestId: string,
  assetId: string,
  prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  void prev;
  void formData;
  try {
    await requireModule("assets");
    await requireRole("hr_administrator");
    await resolveAssetRequest(requestId);
    revalidatePath(`/hr/assets/${assetId}`);
    return { success: "Request resolved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to resolve request." };
  }
}

export async function acknowledgeAssetAction(
  assignmentId: string,
  assetId: string,
  prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  void prev;
  void formData;
  try {
    await requireModule("assets");
    const { requireEmployeeContext } = await import("@/lib/employee/leave");
    const { employeeId } = await requireEmployeeContext();
    await acknowledgeAssignment(assignmentId, employeeId);
    revalidatePath("/employee/assets");
    revalidatePath(`/employee/assets/${assetId}`);
    return { success: "Receipt acknowledged." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to acknowledge asset." };
  }
}

export async function createAssetRequestAction(
  assetId: string,
  _prev: HrActionState,
  formData: FormData,
): Promise<HrActionState> {
  try {
    await requireModule("assets");

    const parsed = assetRequestSchema.safeParse({
      assetId,
      kind: String(formData.get("kind") ?? "").trim(),
      message: readOptional(formData, "message"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
    }

    await createMyAssetRequest(parsed.data);
    revalidatePath("/employee/assets");
    revalidatePath(`/employee/assets/${assetId}`);
    return { success: "Request submitted." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to submit request." };
  }
}

export async function exportAssetRegisterCsv() {
  await requireModule("assets");
  await requireRole("hr_administrator");

  const { listAssets } = await import("@/lib/assets/queries");
  const { assetsToCsv } = await import("@/lib/assets/export");
  const { logReportExport } = await import("@/lib/reports/audit");
  const { parseReportFilters } = await import("@/lib/reports/filters");

  const assets = await listAssets();
  const filters = parseReportFilters({});
  await logReportExport({ slug: "asset-register", format: "csv", filters });
  const date = new Date().toISOString().slice(0, 10);
  return { csv: assetsToCsv(assets), filename: `asset-register-${date}.csv` };
}
