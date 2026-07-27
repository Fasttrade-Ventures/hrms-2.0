import type { CreateEmployeeInput } from "@hrms/validation";

import { logEmployeeEvent } from "@/lib/audit/log-employee-event";
import { createAdminClient } from "@/lib/supabase/admin";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }
  return organizationId;
}

export async function updateEmployeeFullProfile(
  employeeId: string,
  input: CreateEmployeeInput,
  actorUserId: string,
): Promise<void> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();

  const { error: employeeError } = await admin
    .from("employees")
    .update({
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      employee_number: input.employeeNumber?.trim() || undefined,
      branch_id: input.branchId ?? null,
      department_id: input.departmentId ?? null,
      manager_employee_id: input.managerEmployeeId ?? null,
      shift_id: input.shiftId ?? null,
      pay_group_id: input.payGroupId ?? null,
      employment_type: input.employmentType ?? null,
      job_title: input.jobTitle ?? null,
      confirmation_status: input.confirmationStatus ?? null,
      annual_leave_entitlement: input.annualLeaveEntitlement ?? 14,
      annual_leave_carry_forward: input.annualLeaveCarryForward ?? 0,
      join_date: input.joinDate,
    })
    .eq("id", employeeId)
    .eq("organization_id", organizationId);

  if (employeeError) {
    throw new Error(employeeError.message);
  }

  const { error: profileError } = await admin
    .from("employee_profiles")
    .update({
      phone: input.phone ?? null,
      ic_number: input.icNumber ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      race: input.race ?? null,
      religion: input.religion ?? null,
      marital_status: input.maritalStatus ?? null,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? "MY",
      pay_basis: input.payBasis ?? "monthly",
      working_days_per_month: input.workingDaysPerMonth ?? 21,
      basic_salary: input.basicSalary ?? 0,
      bank_name: input.bankName ?? null,
      bank_account_number: input.bankAccountNumber ?? null,
      epf_number: input.epfNumber ?? null,
      socso_number: input.socsoNumber ?? null,
      tax_number: input.taxNumber ?? null,
      profile_photo_path: input.profilePhotoPath ?? null,
    })
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId);

  if (profileError) {
    throw new Error(profileError.message);
  }

  await admin.from("employee_dependents").delete().eq("employee_id", employeeId);
  if (input.dependents?.length) {
    const { error } = await admin.from("employee_dependents").insert(
      input.dependents.map((dependent) => ({
        organization_id: organizationId,
        employee_id: employeeId,
        dependent_type: dependent.dependentType,
        full_name: dependent.fullName,
        ic_number: dependent.icNumber ?? null,
        is_working: dependent.isWorking ?? null,
        date_of_birth: dependent.dateOfBirth ?? null,
      })),
    );
    if (error) throw new Error(error.message);
  }

  await admin.from("employee_emergency_contacts").delete().eq("employee_id", employeeId);
  if (input.emergencyContacts?.length) {
    const { error } = await admin.from("employee_emergency_contacts").insert(
      input.emergencyContacts.map((contact) => ({
        organization_id: organizationId,
        employee_id: employeeId,
        name: contact.name,
        relationship: contact.relationship ?? null,
        phone: contact.phone,
      })),
    );
    if (error) throw new Error(error.message);
  }

  await admin.from("employee_allowed_leave_types").delete().eq("employee_id", employeeId);
  if (input.allowedLeaveTypeIds?.length) {
    const { error } = await admin.from("employee_allowed_leave_types").insert(
      input.allowedLeaveTypeIds.map((leaveTypeId) => ({
        organization_id: organizationId,
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
      })),
    );
    if (error) throw new Error(error.message);
  }

  if (input.portalRole) {
    await admin
      .from("organization_memberships")
      .update({ roles: [input.portalRole] })
      .eq("employee_id", employeeId)
      .eq("organization_id", organizationId);
  }

  await logEmployeeEvent({
    action: "employee.updated",
    actorUserId,
    organizationId,
    employeeId,
    metadata: { section: "full_profile" },
  });
}
