"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  emergencyContactSchema,
  updateEmployeeAddressSchema,
  updateEmployeeBankSchema,
  updateEmployeeCoreSchema,
  updateEmployeePersonalSchema,
} from "@hrms/validation";

import { logEmployeeEvent } from "@/lib/audit/log-employee-event";
import { createEmployeeRecord, resendEmployeeActivationEmail } from "@/lib/employees/create-employee";
import { parseEmployeeProfileFormData } from "@/lib/employees/parse-profile-form";
import {
  resolveEmployeeProfilePhoto,
  setEmployeeProfilePhotoPath,
  uploadEmployeeProfilePhoto,
} from "@/lib/employees/profile-photo";
import { updateEmployeeFullProfile } from "@/lib/employees/update-employee";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type EmployeeActionState = {
  error?: string;
  success?: string;
  employeeId?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }

  return organizationId;
}

function readOptionalUuid(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value : null;
}

export async function createEmployee(
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const parsed = parseEmployeeProfileFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const result = await createEmployeeRecord(parsed.data, session.user.id);
    const file = formData.get("profilePhoto");
    if (file instanceof File && file.size > 0) {
      const photoPath = await uploadEmployeeProfilePhoto(result.employeeId, file);
      await setEmployeeProfilePhotoPath(result.employeeId, photoPath);
    }

    revalidatePath("/hr/employees");

    if (result.activationEmailError) {
      redirect(`/hr/employees/${result.employeeId}/edit?created=1&emailWarning=1`);
    }

    redirect(`/hr/employees/${result.employeeId}/edit?created=1`);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create employee.",
    };
  }
}

export async function updateEmployeeFull(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const parsed = parseEmployeeProfileFormData(formData);

  if (!parsed.success) {
    return { error: parsed.error };
  }

  try {
    const profilePhotoPath = await resolveEmployeeProfilePhoto(
      employeeId,
      formData,
      parsed.data.profilePhotoPath ?? null,
      parsed.data.removeProfilePhoto ?? false,
    );

    await updateEmployeeFullProfile(
      employeeId,
      { ...parsed.data, profilePhotoPath },
      session.user.id,
    );
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${employeeId}`);
    revalidatePath(`/hr/employees/${employeeId}/edit`);
    return { success: "Employee profile saved." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update employee.",
    };
  }
}

export async function updateEmployeeCore(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateEmployeeCoreSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim() || undefined,
    email: String(formData.get("email") ?? "").trim() || undefined,
    branchId: readOptionalUuid(formData, "branchId"),
    departmentId: readOptionalUuid(formData, "departmentId"),
    managerEmployeeId: readOptionalUuid(formData, "managerEmployeeId"),
    joinDate: String(formData.get("joinDate") ?? "").trim() || undefined,
    status: String(formData.get("status") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid employee details." };
  }

  const supabase = await createClient();
  const updatePayload = {
    ...(parsed.data.fullName ? { full_name: parsed.data.fullName } : {}),
    ...(parsed.data.email ? { email: parsed.data.email.toLowerCase() } : {}),
  ...(parsed.data.branchId !== undefined ? { branch_id: parsed.data.branchId } : {}),
    ...(parsed.data.departmentId !== undefined ? { department_id: parsed.data.departmentId } : {}),
    ...(parsed.data.managerEmployeeId !== undefined
      ? { manager_employee_id: parsed.data.managerEmployeeId }
      : {}),
    ...(parsed.data.joinDate ? { join_date: parsed.data.joinDate } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
  };

  const { error } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.updated",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
    metadata: { section: "employment" },
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  revalidatePath("/hr/employees");

  return { success: "Employee updated." };
}

export async function updateEmployeePersonal(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateEmployeePersonalSchema.safeParse({
    phone: String(formData.get("phone") ?? "").trim() || null,
    icNumber: String(formData.get("icNumber") ?? "").trim() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid personal details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_profiles")
    .update({
      phone: parsed.data.phone,
      ic_number: parsed.data.icNumber,
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.updated",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
    metadata: { section: "personal" },
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  return { success: "Personal details updated." };
}

export async function updateEmployeeAddress(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateEmployeeAddressSchema.safeParse({
    addressLine1: String(formData.get("addressLine1") ?? "").trim() || null,
    addressLine2: String(formData.get("addressLine2") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    state: String(formData.get("state") ?? "").trim() || null,
    postcode: String(formData.get("postcode") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid address." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_profiles")
    .update({
      address_line1: parsed.data.addressLine1,
      address_line2: parsed.data.addressLine2,
      city: parsed.data.city,
      state: parsed.data.state,
      postcode: parsed.data.postcode,
      country: parsed.data.country,
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.updated",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
    metadata: { section: "address" },
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  return { success: "Address updated." };
}

export async function updateEmployeeBank(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = updateEmployeeBankSchema.safeParse({
    bankName: String(formData.get("bankName") ?? "").trim() || null,
    bankAccountNumber: String(formData.get("bankAccountNumber") ?? "").trim() || null,
    epfNumber: String(formData.get("epfNumber") ?? "").trim() || null,
    socsoNumber: String(formData.get("socsoNumber") ?? "").trim() || null,
    taxNumber: String(formData.get("taxNumber") ?? "").trim() || null,
    basicSalary: String(formData.get("basicSalary") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid bank details." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_profiles")
    .update({
      bank_name: parsed.data.bankName,
      bank_account_number: parsed.data.bankAccountNumber,
      epf_number: parsed.data.epfNumber,
      socso_number: parsed.data.socsoNumber,
      tax_number: parsed.data.taxNumber,
      ...(parsed.data.basicSalary ? { basic_salary: parsed.data.basicSalary } : {}),
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.updated",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
    metadata: { section: "bank" },
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  return { success: "Bank and statutory details updated." };
}

export async function addEmergencyContact(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();

  const parsed = emergencyContactSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    relationship: String(formData.get("relationship") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid emergency contact." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employee_emergency_contacts").insert({
    employee_id: employeeId,
    organization_id: organizationId,
    name: parsed.data.name,
    relationship: parsed.data.relationship ?? null,
    phone: parsed.data.phone,
  });

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.emergency_contact_added",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  return { success: "Emergency contact added." };
}

export async function deactivateEmployee(
  employeeId: string,
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const status = String(formData.get("status") ?? "inactive").trim();

  if (status !== "inactive" && status !== "terminated") {
    return { error: "Invalid status." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status })
    .eq("id", employeeId)
    .eq("organization_id", organizationId);

  if (error) {
    return { error: error.message };
  }

  await logEmployeeEvent({
    action: "employee.deactivated",
    actorUserId: session.user.id,
    organizationId,
    employeeId,
    metadata: { status },
  });

  revalidatePath(`/hr/employees/${employeeId}`);
  revalidatePath(`/hr/employees/${employeeId}/edit`);
  revalidatePath("/hr/employees");

  return { success: `Employee marked as ${status}.` };
}

export async function resendActivation(
  employeeId: string,
): Promise<EmployeeActionState> {
  const session = await requireRole("hr_administrator");

  try {
    const result = await resendEmployeeActivationEmail(employeeId, session.user.id);

    if (!result.sent) {
      return { error: result.error ?? "Failed to send activation email." };
    }

    return { success: "Activation email sent." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to resend activation email.",
    };
  }
}
