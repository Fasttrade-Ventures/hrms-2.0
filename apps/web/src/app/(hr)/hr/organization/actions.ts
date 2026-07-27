"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBranchSchema,
  createDepartmentSchema,
  createHolidaySchema,
  createLeaveTypeSchema,
  createShiftSchema,
  createAssetCategorySchema,
  updateAssetCategorySchema,
  importHolidaysSchema,
  updateBranchSchema,
  updateDepartmentSchema,
  updateHolidaySchema,
  updateLeaveTypeSchema,
  updateShiftSchema,
} from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { fetchMalaysiaHolidaysForState, mergeHolidayNames } from "@/lib/hr/malaysia-holidays-api";
import { getOrganizationId } from "@/lib/hr/organization";
import { createClient } from "@/lib/supabase/server";
import { createAssetCategory, updateAssetCategory } from "@/lib/assets/categories";

export type OrgActionState = {
  error?: string;
  success?: string;
};

export type ImportHolidaysResult = {
  imported: number;
  updated: number;
  skipped: number;
  error?: string;
  success?: string;
};

function readOptionalUuid(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value : null;
}

function readCheckbox(formData: FormData, name: string): boolean {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
}

function revalidateOrg(paths: string[] = []) {
  revalidatePath("/hr/organization");
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function createBranch(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = createBranchSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    weekendMode: String(formData.get("weekendMode") ?? "sat_sun").trim(),
    payrollCutoffDay: String(formData.get("payrollCutoffDay") ?? "6").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid branch details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    state: parsed.data.state,
    weekend_mode: parsed.data.weekendMode,
    payroll_cutoff_day: parsed.data.payrollCutoffDay,
  });

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/branches"]);
  redirect("/hr/organization/branches");
}

export async function updateBranch(
  branchId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateBranchSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    weekendMode: String(formData.get("weekendMode") ?? "sat_sun").trim(),
    payrollCutoffDay: String(formData.get("payrollCutoffDay") ?? "6").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid branch details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("branches")
    .update({
      name: parsed.data.name,
      state: parsed.data.state,
      weekend_mode: parsed.data.weekendMode,
      payroll_cutoff_day: parsed.data.payrollCutoffDay,
    })
    .eq("id", branchId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/branches", `/hr/organization/branches/${branchId}/edit`]);
  return { success: "Branch saved." };
}

export async function deleteBranch(branchId: string): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("branch_id", branchId);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Cannot delete a branch that still has employees assigned." };
  }

  const { error } = await supabase
    .from("branches")
    .delete()
    .eq("id", branchId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/branches"]);
  return { success: "Branch deleted." };
}

export async function createDepartment(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = createDepartmentSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    branchId: readOptionalUuid(formData, "branchId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid department details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("departments").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    branch_id: parsed.data.branchId ?? null,
  });

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/departments"]);
  redirect("/hr/organization/departments");
}

export async function updateDepartment(
  departmentId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateDepartmentSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    branchId: readOptionalUuid(formData, "branchId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid department details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("departments")
    .update({
      name: parsed.data.name,
      branch_id: parsed.data.branchId ?? null,
    })
    .eq("id", departmentId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg([
    "/hr/organization/departments",
    `/hr/organization/departments/${departmentId}/edit`,
  ]);
  return { success: "Department saved." };
}

export async function deleteDepartment(departmentId: string): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("department_id", departmentId);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Cannot delete a department that still has employees assigned." };
  }

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("id", departmentId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/departments"]);
  return { success: "Department deleted." };
}

export async function createShift(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = createShiftSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    graceMinutes: String(formData.get("graceMinutes") ?? "0").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid shift details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    start_time: normalizeTime(parsed.data.startTime),
    end_time: normalizeTime(parsed.data.endTime),
    grace_minutes: parsed.data.graceMinutes,
  });

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/shifts"]);
  redirect("/hr/organization/shifts");
}

export async function updateShift(
  shiftId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateShiftSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    startTime: String(formData.get("startTime") ?? "").trim(),
    endTime: String(formData.get("endTime") ?? "").trim(),
    graceMinutes: String(formData.get("graceMinutes") ?? "0").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid shift details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({
      name: parsed.data.name,
      start_time: normalizeTime(parsed.data.startTime),
      end_time: normalizeTime(parsed.data.endTime),
      grace_minutes: parsed.data.graceMinutes,
    })
    .eq("id", shiftId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/shifts", `/hr/organization/shifts/${shiftId}/edit`]);
  return { success: "Shift saved." };
}

export async function deleteShift(shiftId: string): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("shift_id", shiftId);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Cannot delete a shift that still has employees assigned." };
  }

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", shiftId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/shifts"]);
  return { success: "Shift deleted." };
}

export async function createHoliday(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = createHolidaySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    holidayDate: String(formData.get("holidayDate") ?? "").trim(),
    branchId: readOptionalUuid(formData, "branchId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid holiday details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("holidays").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    holiday_date: parsed.data.holidayDate,
    branch_id: parsed.data.branchId ?? null,
  });

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/holidays"]);
  redirect("/hr/organization/holidays");
}

export async function updateHoliday(
  holidayId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateHolidaySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    holidayDate: String(formData.get("holidayDate") ?? "").trim(),
    branchId: readOptionalUuid(formData, "branchId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid holiday details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("holidays")
    .update({
      name: parsed.data.name,
      holiday_date: parsed.data.holidayDate,
      branch_id: parsed.data.branchId ?? null,
    })
    .eq("id", holidayId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/holidays", `/hr/organization/holidays/${holidayId}/edit`]);
  return { success: "Holiday saved." };
}

export async function deleteHoliday(holidayId: string): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", holidayId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/holidays"]);
  return { success: "Holiday deleted." };
}

export async function importHolidays(input: {
  branchId: string;
  year: number;
}): Promise<ImportHolidaysResult> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = importHolidaysSchema.safeParse(input);
  if (!parsed.success) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: parsed.error.issues[0]?.message ?? "Invalid import request.",
    };
  }

  const supabase = await createClient();
  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, name, state")
    .eq("organization_id", organizationId)
    .eq("id", parsed.data.branchId)
    .maybeSingle();

  if (branchError) {
    return { imported: 0, updated: 0, skipped: 0, error: branchError.message };
  }
  if (!branch) {
    return { imported: 0, updated: 0, skipped: 0, error: "Branch not found." };
  }
  if (!branch.state?.trim()) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: "Set the branch state before importing public holidays.",
    };
  }

  let fetched;
  try {
    fetched = await fetchMalaysiaHolidaysForState(branch.state, parsed.data.year);
  } catch (error) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Could not fetch holidays.",
    };
  }

  if (fetched.length === 0) {
    return {
      imported: 0,
      updated: 0,
      skipped: 0,
      error: "No confirmed public holidays found for this state and year.",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("holidays")
    .select("id, holiday_date, name")
    .eq("organization_id", organizationId)
    .eq("branch_id", parsed.data.branchId)
    .gte("holiday_date", `${parsed.data.year}-01-01`)
    .lte("holiday_date", `${parsed.data.year}-12-31`);

  if (existingError) {
    return { imported: 0, updated: 0, skipped: 0, error: existingError.message };
  }

  const existingByDate = new Map(
    (existing ?? []).map((row) => [row.holiday_date, { id: row.id, name: row.name }]),
  );

  const toInsert: Array<{
    organization_id: string;
    branch_id: string;
    name: string;
    holiday_date: string;
  }> = [];
  const toUpdate: Array<{ id: string; name: string }> = [];
  let skipped = 0;

  for (const holiday of fetched) {
    const current = existingByDate.get(holiday.holidayDate);
    if (!current) {
      toInsert.push({
        organization_id: organizationId,
        branch_id: parsed.data.branchId,
        name: holiday.name,
        holiday_date: holiday.holidayDate,
      });
      continue;
    }

    if (current.name === holiday.name) {
      skipped += 1;
      continue;
    }

    toUpdate.push({ id: current.id, name: mergeHolidayNames(current.name, holiday.name) });
  }

  if (toInsert.length === 0 && toUpdate.length === 0) {
    revalidateOrg(["/hr/organization/holidays"]);
    return {
      imported: 0,
      updated: 0,
      skipped,
      success: "Public holidays for this branch and year are already imported.",
    };
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase.from("holidays").insert(toInsert);
    if (insertError) {
      return { imported: 0, updated: 0, skipped, error: insertError.message };
    }
  }

  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.map((holiday) =>
        supabase
          .from("holidays")
          .update({ name: holiday.name })
          .eq("id", holiday.id)
          .eq("organization_id", organizationId),
      ),
    );
    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      return {
        imported: toInsert.length,
        updated: 0,
        skipped,
        error: updateError.message,
      };
    }
  }

  revalidateOrg(["/hr/organization/holidays"]);

  const parts: string[] = [];
  if (toInsert.length > 0) {
    parts.push(
      `imported ${toInsert.length} new holiday${toInsert.length === 1 ? "" : "s"}`,
    );
  }
  if (toUpdate.length > 0) {
    parts.push(
      `updated ${toUpdate.length} holiday name${toUpdate.length === 1 ? "" : "s"}`,
    );
  }
  if (skipped > 0) {
    parts.push(`${skipped} unchanged`);
  }

  return {
    imported: toInsert.length,
    updated: toUpdate.length,
    skipped,
    success: `${parts[0]![0]!.toUpperCase()}${parts[0]!.slice(1)}${parts.length > 1 ? `; ${parts.slice(1).join("; ")}` : ""}.`,
  };
}

export async function createLeaveType(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = createLeaveTypeSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    entitlementDays: String(formData.get("entitlementDays") ?? "0").trim(),
    requiresAttachment: readCheckbox(formData, "requiresAttachment"),
    isUnpaid: readCheckbox(formData, "isUnpaid"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid leave type details." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("leave_types").insert({
    organization_id: organizationId,
    name: parsed.data.name,
    entitlement_days: parsed.data.entitlementDays,
    requires_attachment: parsed.data.requiresAttachment,
    is_unpaid: parsed.data.isUnpaid,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { error: "A leave type with this name already exists." };
    }
    return { error: error.message };
  }

  revalidateOrg(["/hr/organization/leave-types"]);
  redirect("/hr/organization/leave-types");
}

export async function updateLeaveType(
  leaveTypeId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateLeaveTypeSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    entitlementDays: String(formData.get("entitlementDays") ?? "0").trim(),
    requiresAttachment: readCheckbox(formData, "requiresAttachment"),
    isUnpaid: readCheckbox(formData, "isUnpaid"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid leave type details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leave_types")
    .update({
      name: parsed.data.name,
      entitlement_days: parsed.data.entitlementDays,
      requires_attachment: parsed.data.requiresAttachment,
      is_unpaid: parsed.data.isUnpaid,
    })
    .eq("id", leaveTypeId)
    .eq("organization_id", organizationId);

  if (error) {
    if (error.message.toLowerCase().includes("duplicate") || error.code === "23505") {
      return { error: "A leave type with this name already exists." };
    }
    return { error: error.message };
  }

  revalidateOrg([
    "/hr/organization/leave-types",
    `/hr/organization/leave-types/${leaveTypeId}/edit`,
  ]);
  return { success: "Leave type saved." };
}

export async function deleteLeaveType(leaveTypeId: string): Promise<OrgActionState> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("leave_type_id", leaveTypeId);

  if (countError) return { error: countError.message };
  if ((count ?? 0) > 0) {
    return { error: "Cannot delete a leave type that has leave requests." };
  }

  const { error } = await supabase
    .from("leave_types")
    .delete()
    .eq("id", leaveTypeId)
    .eq("organization_id", organizationId);

  if (error) return { error: error.message };

  revalidateOrg(["/hr/organization/leave-types"]);
  return { success: "Leave type deleted." };
}

function parseFieldSchemaJson(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createAssetCategoryAction(
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");

  const parsed = createAssetCategorySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    sortOrder: String(formData.get("sortOrder") ?? "0").trim(),
    isActive: readCheckbox(formData, "isActive"),
    fieldSchema: parseFieldSchemaJson(String(formData.get("fieldSchemaJson") ?? "[]")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category details." };
  }

  try {
    await createAssetCategory(parsed.data);
    revalidateOrg(["/hr/organization/asset-categories", "/hr/organization"]);
    redirect("/hr/organization/asset-categories");
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    return { error: error instanceof Error ? error.message : "Failed to create category." };
  }
}

export async function updateAssetCategoryAction(
  categoryId: string,
  _prevState: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  await requireRole("hr_administrator");

  const parsed = updateAssetCategorySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    sortOrder: String(formData.get("sortOrder") ?? "0").trim(),
    isActive: readCheckbox(formData, "isActive"),
    fieldSchema: parseFieldSchemaJson(String(formData.get("fieldSchemaJson") ?? "[]")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid category details." };
  }

  try {
    await updateAssetCategory(categoryId, parsed.data);
    revalidateOrg([
      "/hr/organization/asset-categories",
      `/hr/organization/asset-categories/${categoryId}/edit`,
      "/hr/organization",
    ]);
    return { success: "Category saved." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update category." };
  }
}
