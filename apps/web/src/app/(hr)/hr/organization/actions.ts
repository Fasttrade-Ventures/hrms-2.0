"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBranchSchema,
  createDepartmentSchema,
  createHolidaySchema,
  createLeaveTypeSchema,
  createShiftSchema,
  updateBranchSchema,
  updateDepartmentSchema,
  updateHolidaySchema,
  updateLeaveTypeSchema,
  updateShiftSchema,
} from "@hrms/validation";

import { requireRole } from "@/lib/auth/session";
import { getOrganizationId } from "@/lib/hr/organization";
import { createClient } from "@/lib/supabase/server";

export type OrgActionState = {
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
