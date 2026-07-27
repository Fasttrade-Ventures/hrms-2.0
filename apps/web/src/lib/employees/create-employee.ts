import type { CreateEmployeeInput } from "@hrms/validation";
import { sendEmployeeActivationEmail } from "@hrms/platform";

import { logEmployeeEvent } from "@/lib/audit/log-employee-event";
import { createAdminClient } from "@/lib/supabase/admin";

import { getNextEmployeeNumber } from "./organization";

export type CreateEmployeeResult = {
  employeeId: string;
  employeeNumber: string;
  activationEmailSent: boolean;
  activationEmailError?: string;
};

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!organizationId) {
    throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  }

  return organizationId;
}

async function getOrganizationName(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  const { data } = await admin.from("organizations").select("name").eq("id", organizationId).maybeSingle();
  return data?.name ?? "your organization";
}

export async function createEmployeeRecord(
  input: CreateEmployeeInput,
  actorUserId: string,
): Promise<CreateEmployeeResult> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();
  const employeeNumber = input.employeeNumber?.trim() || (await getNextEmployeeNumber(organizationId));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: duplicate } = await admin
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .or(`email.eq.${input.email},employee_number.eq.${employeeNumber}`)
    .maybeSingle();

  if (duplicate) {
    throw new Error("An employee with this email or employee number already exists.");
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      organization_id: organizationId,
      employee_number: employeeNumber,
      full_name: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
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
      status: "active",
      join_date: input.joinDate,
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "Failed to create employee.");
  }

  const { error: profileError } = await admin.from("employee_profiles").insert({
    employee_id: employee.id,
    organization_id: organizationId,
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
  });

  if (profileError) {
    await admin.from("employees").delete().eq("id", employee.id);
    throw new Error(profileError.message);
  }

  if (input.dependents?.length) {
    const { error: dependentsError } = await admin.from("employee_dependents").insert(
      input.dependents.map((dependent) => ({
        organization_id: organizationId,
        employee_id: employee.id,
        dependent_type: dependent.dependentType,
        full_name: dependent.fullName,
        ic_number: dependent.icNumber ?? null,
        is_working: dependent.isWorking ?? null,
        date_of_birth: dependent.dateOfBirth ?? null,
      })),
    );

    if (dependentsError) {
      await admin.from("employees").delete().eq("id", employee.id);
      throw new Error(dependentsError.message);
    }
  }

  if (input.emergencyContacts?.length) {
    const { error: emergencyError } = await admin.from("employee_emergency_contacts").insert(
      input.emergencyContacts.map((contact) => ({
        organization_id: organizationId,
        employee_id: employee.id,
        name: contact.name,
        relationship: contact.relationship ?? null,
        phone: contact.phone,
      })),
    );

    if (emergencyError) {
      await admin.from("employees").delete().eq("id", employee.id);
      throw new Error(emergencyError.message);
    }
  }

  if (input.allowedLeaveTypeIds?.length) {
    const { error: leaveAccessError } = await admin.from("employee_allowed_leave_types").insert(
      input.allowedLeaveTypeIds.map((leaveTypeId) => ({
        organization_id: organizationId,
        employee_id: employee.id,
        leave_type_id: leaveTypeId,
      })),
    );

    if (leaveAccessError) {
      await admin.from("employees").delete().eq("id", employee.id);
      throw new Error(leaveAccessError.message);
    }
  }

  let userId: string | null = null;
  let activationEmailSent = false;
  let activationEmailError: string | undefined;

  try {
    if (input.sendActivationEmail) {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "invite",
        email: input.email.trim().toLowerCase(),
        options: {
          redirectTo: `${siteUrl}/auth/callback?next=/auth/activate`,
          data: { full_name: input.fullName.trim() },
        },
      });

      if (linkError || !linkData.user) {
        throw new Error(linkError?.message ?? "Failed to create login for employee.");
      }

      userId = linkData.user.id;

      const { error: membershipError } = await admin.from("organization_memberships").insert({
        organization_id: organizationId,
        user_id: userId,
        employee_id: employee.id,
        roles: [input.portalRole || "employee"],
        branch_id: input.branchId ?? null,
      });

      if (membershipError) {
        throw new Error(membershipError.message);
      }

      const organizationName = await getOrganizationName(admin, organizationId);
      const mailResult = await sendEmployeeActivationEmail({
        to: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        organizationName,
        activationLink: linkData.properties.action_link,
      });

      activationEmailSent = mailResult.sent;
      if (!mailResult.sent) {
        activationEmailError =
          mailResult.reason === "not_configured"
            ? "Email provider is not configured."
            : mailResult.detail ?? "Activation email failed.";
      }
    }
  } catch (error) {
    activationEmailError = error instanceof Error ? error.message : "Activation setup failed.";
  }

  await logEmployeeEvent({
    action: "employee.created",
    actorUserId,
    organizationId,
    employeeId: employee.id,
    metadata: {
      employeeNumber,
      activationEmailSent,
      portalRole: input.portalRole,
    },
  });

  return {
    employeeId: employee.id,
    employeeNumber,
    activationEmailSent,
    activationEmailError,
  };
}

export async function resendEmployeeActivationEmail(employeeId: string, actorUserId: string) {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: employee, error } = await admin
    .from("employees")
    .select("id, full_name, email, branch_id")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !employee) {
    throw new Error(error?.message ?? "Employee not found.");
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: employee.email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/activate`,
      data: { full_name: employee.full_name },
    },
  });

  if (linkError || !linkData.user) {
    return { sent: false, error: linkError?.message ?? "Failed to generate activation link." };
  }

  const { data: existingMembership } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (!existingMembership) {
    const { error: membershipError } = await admin.from("organization_memberships").insert({
      organization_id: organizationId,
      user_id: linkData.user.id,
      employee_id: employeeId,
      roles: ["employee"],
      branch_id: employee.branch_id,
    });

    if (membershipError) {
      return { sent: false, error: membershipError.message };
    }
  }

  const organizationName = await getOrganizationName(admin, organizationId);
  const mailResult = await sendEmployeeActivationEmail({
    to: employee.email,
    fullName: employee.full_name,
    organizationName,
    activationLink: linkData.properties.action_link,
  });

  if (mailResult.sent) {
    await logEmployeeEvent({
      action: "employee.activation_resent",
      actorUserId,
      organizationId,
      employeeId,
    });
  }

  return {
    sent: mailResult.sent,
    error: mailResult.sent
      ? undefined
      : mailResult.reason === "not_configured"
        ? "Email provider is not configured."
        : mailResult.detail ?? "Failed to send email.",
  };
}
