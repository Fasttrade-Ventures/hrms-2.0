import { requireOrganizationId } from "@/lib/auth/organization-context";
import { buildSimplePdf } from "@/lib/files/simple-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications/queue";

export const PROBATION_REMINDER_DAYS = 7;

export type ProbationReminderCandidate = {
  organizationId: string;
  employeeId: string;
  employeeName: string;
  probationEndDate: string;
  asOfDate: string;
};

export type ProbationReminderPlan = {
  organizationId: string;
  employeeId: string;
  employeeName: string;
  probationEndDate: string;
  daysUntilEnd: number;
  idempotencyKey: string;
};

export function daysUntilDate(asOfDate: string, endDate: string): number {
  const asOfUtc = Date.parse(`${asOfDate}T00:00:00Z`);
  const endUtc = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((endUtc - asOfUtc) / 86_400_000);
}

export function planProbationReminder(
  input: ProbationReminderCandidate,
): ProbationReminderPlan | null {
  const daysUntilEnd = daysUntilDate(input.asOfDate, input.probationEndDate);
  if (daysUntilEnd < 0 || daysUntilEnd > PROBATION_REMINDER_DAYS) return null;

  return {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    probationEndDate: input.probationEndDate,
    daysUntilEnd,
    idempotencyKey: `probation-reminder:${input.organizationId}:${input.employeeId}:${input.probationEndDate}`,
  };
}

export function probationReminderMessage(plan: ProbationReminderPlan): string {
  if (plan.daysUntilEnd === 0) {
    return `${plan.employeeName}'s probation ends today (${plan.probationEndDate}).`;
  }
  return `${plan.employeeName}'s probation ends on ${plan.probationEndDate} (${plan.daysUntilEnd} day(s) left).`;
}

export function confirmedOnForStatus(
  status: string | null | undefined,
  existingConfirmedOn: string | null | undefined,
  asOfDate: string,
): string | null {
  if (status !== "confirmed") return null;
  return existingConfirmedOn ?? asOfDate;
}

export function buildConfirmationLetterPdf(input: {
  organizationName: string;
  employeeName: string;
  employeeNumber: string;
  jobTitle: string | null;
  confirmedOn: string;
}): Uint8Array {
  return buildSimplePdf([
    input.organizationName,
    "",
    "Confirmation of employment",
    "",
    `Employee: ${input.employeeName}`,
    `Staff ID: ${input.employeeNumber}`,
    `Position: ${input.jobTitle?.trim() || "—"}`,
    `Confirmed on: ${input.confirmedOn}`,
    "",
    "This letter confirms that the employee has completed probation",
    "and is confirmed in employment on the date above.",
  ]);
}

type AdminClient = ReturnType<typeof createAdminClient>;

export type ProbationReminderResult = {
  remindedCount: number;
  skippedCount: number;
};

export async function performProbationReminders(options?: {
  organizationId?: string;
  asOfDate?: string;
  dryRun?: boolean;
  client?: AdminClient;
}): Promise<ProbationReminderResult> {
  const admin = options?.client ?? createAdminClient();
  const asOfDate = options?.asOfDate ?? new Date().toISOString().slice(0, 10);

  let employeesQuery = admin
    .from("employees")
    .select("id, organization_id, full_name, probation_end_date")
    .eq("status", "active")
    .eq("confirmation_status", "probation")
    .not("probation_end_date", "is", null);

  if (options?.organizationId) {
    employeesQuery = employeesQuery.eq("organization_id", options.organizationId);
  }

  const { data: employees, error } = await employeesQuery;
  if (error) throw new Error(error.message);

  let remindedCount = 0;
  let skippedCount = 0;

  for (const employee of employees ?? []) {
    const plan = planProbationReminder({
      organizationId: employee.organization_id,
      employeeId: employee.id,
      employeeName: employee.full_name,
      probationEndDate: employee.probation_end_date,
      asOfDate,
    });

    if (!plan) {
      skippedCount += 1;
      continue;
    }

    if (!options?.dryRun) {
      const { data: hrUsers, error: hrError } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", employee.organization_id)
        .contains("roles", ["hr_administrator"]);

      if (hrError) throw new Error(hrError.message);

      for (const hrUser of hrUsers ?? []) {
        await queueNotification({
          organizationId: employee.organization_id,
          recipientUserId: hrUser.user_id,
          channel: "in_app",
          template: "employee.probation_ending",
          payload: {
            title: "Probation ending",
            message: probationReminderMessage(plan),
            employeeId: plan.employeeId,
            probationEndDate: plan.probationEndDate,
            daysUntilEnd: plan.daysUntilEnd,
            href: `/hr/employees/${plan.employeeId}/edit`,
          },
          idempotencyKey: `${plan.idempotencyKey}:${hrUser.user_id}`,
        });
      }
    }

    remindedCount += 1;
  }

  return { remindedCount, skippedCount };
}

export async function getConfirmationLetter(
  employeeId: string,
): Promise<{ filename: string; pdf: Uint8Array } | null> {
  const organizationId = await requireOrganizationId();
  const admin = createAdminClient();
  const { data: employee, error } = await admin
    .from("employees")
    .select("full_name, employee_number, job_title, confirmation_status, confirmed_on, organizations(name)")
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee || employee.confirmation_status !== "confirmed" || !employee.confirmed_on) {
    return null;
  }

  const organization = Array.isArray(employee.organizations)
    ? employee.organizations[0]
    : employee.organizations;

  const pdf = buildConfirmationLetterPdf({
    organizationName: organization?.name ?? "Organization",
    employeeName: employee.full_name,
    employeeNumber: employee.employee_number,
    jobTitle: employee.job_title,
    confirmedOn: employee.confirmed_on,
  });

  return {
    filename: `confirmation-${employee.employee_number}.pdf`,
    pdf,
  };
}
