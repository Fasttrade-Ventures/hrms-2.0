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
  });

  if (profileError) {
    await admin.from("employees").delete().eq("id", employee.id);
    throw new Error(profileError.message);
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
        roles: ["employee"],
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
            ? "Employee created, but email is not configured (RESEND_API_KEY / MAIL_FROM)."
            : mailResult.detail ?? "Failed to send activation email.";
      }
    }
  } catch (error) {
    if (userId) {
      await admin.from("organization_memberships").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }

    await admin.from("employee_profiles").delete().eq("employee_id", employee.id);
    await admin.from("employees").delete().eq("id", employee.id);

    throw error instanceof Error ? error : new Error("Failed to create employee login.");
  }

  await logEmployeeEvent({
    action: "employee.created",
    actorUserId,
    organizationId,
    employeeId: employee.id,
    metadata: {
      email: input.email,
      employeeNumber,
      sendActivationEmail: input.sendActivationEmail,
      activationEmailSent,
    },
  });

  return {
    employeeId: employee.id,
    employeeNumber,
    activationEmailSent,
    activationEmailError,
  };
}

export async function resendEmployeeActivationEmail(
  employeeId: string,
  actorUserId: string,
): Promise<{ sent: boolean; error?: string }> {
  const admin = createAdminClient();
  const organizationId = getOrganizationId();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data: employee, error } = await admin
    .from("employees")
    .select("id, email, full_name")
    .eq("organization_id", organizationId)
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !employee) {
    throw new Error("Employee not found.");
  }

  const { data: membership } = await admin
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: employee.email,
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/activate`,
      data: { full_name: employee.full_name },
    },
  });

  if (linkError || !linkData.user) {
    throw new Error(linkError?.message ?? "Failed to generate activation link.");
  }

  if (!membership) {
    const { error: membershipError } = await admin.from("organization_memberships").insert({
      organization_id: organizationId,
      user_id: linkData.user.id,
      employee_id: employee.id,
      roles: ["employee"],
    });

    if (membershipError) {
      throw new Error(membershipError.message);
    }
  }

  const organizationName = await getOrganizationName(admin, organizationId);
  const mailResult = await sendEmployeeActivationEmail({
    to: employee.email,
    fullName: employee.full_name,
    organizationName,
    activationLink: linkData.properties.action_link,
  });

  await logEmployeeEvent({
    action: "employee.activation_resent",
    actorUserId,
    organizationId,
    employeeId,
    metadata: { email: employee.email, sent: mailResult.sent },
  });

  if (!mailResult.sent) {
    return {
      sent: false,
      error:
        mailResult.reason === "not_configured"
          ? "Email is not configured (RESEND_API_KEY / MAIL_FROM)."
          : mailResult.detail ?? "Failed to send activation email.",
    };
  }

  return { sent: true };
}
