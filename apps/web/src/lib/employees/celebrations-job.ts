import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserIdForEmployee } from "@/lib/approvals/service";
import { queueNotification } from "@/lib/notifications/queue";
import { celebrationKey, isAnniversaryOn, isBirthdayOn } from "@/lib/employees/celebrations";

function todayInKualaLumpur(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function performCelebrations(input?: { asOfDate?: string; organizationId?: string }): Promise<{
  birthdays: number;
  anniversaries: number;
}> {
  const today = input?.asOfDate ?? todayInKualaLumpur();
  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select("id, organization_id, full_name, join_date, status, employee_profiles(date_of_birth)")
    .eq("status", "active");
  if (input?.organizationId) query = query.eq("organization_id", input.organizationId);

  const { data: employees, error } = await query;
  if (error) throw new Error(error.message);

  const { data: orgs } = await admin.from("organizations").select("id, product_tier");
  const paidOrgs = new Set(
    (orgs ?? [])
      .filter((org) => org.product_tier === "professional" || org.product_tier === "enterprise")
      .map((org) => org.id as string),
  );

  let birthdays = 0;
  let anniversaries = 0;
  const digests = new Map<string, string[]>();

  for (const employee of employees ?? []) {
    const organizationId = employee.organization_id as string;
    if (!paidOrgs.has(organizationId)) continue;
    const profile = Array.isArray(employee.employee_profiles)
      ? employee.employee_profiles[0]
      : employee.employee_profiles;
    const birthDate = (profile as { date_of_birth?: string | null } | null)?.date_of_birth ?? null;
    const name = String(employee.full_name ?? "Employee");
    const userId = await resolveUserIdForEmployee(organizationId, employee.id as string, admin);
    const notes: string[] = [];

    if (isBirthdayOn(birthDate, today)) {
      birthdays += 1;
      notes.push(`${name} has a birthday`);
      await queueNotification({
        organizationId,
        recipientUserId: userId,
        channel: "in_app",
        template: "celebration.birthday",
        payload: { message: "Happy birthday from BukuHR." },
        idempotencyKey: celebrationKey({
          organizationId,
          employeeId: employee.id as string,
          kind: "birthday",
          today,
        }),
      });
      await queueNotification({
        organizationId,
        recipientUserId: userId,
        channel: "email",
        template: "celebration.notice",
        payload: { subject: "Happy birthday", message: "Happy birthday from BukuHR." },
        idempotencyKey: `${celebrationKey({
          organizationId,
          employeeId: employee.id as string,
          kind: "birthday",
          today,
        })}:email`,
      });
    }

    if (isAnniversaryOn(String(employee.join_date), today)) {
      anniversaries += 1;
      notes.push(`${name} has a work anniversary`);
      await queueNotification({
        organizationId,
        recipientUserId: userId,
        channel: "in_app",
        template: "celebration.anniversary",
        payload: { message: "Happy work anniversary from BukuHR." },
        idempotencyKey: celebrationKey({
          organizationId,
          employeeId: employee.id as string,
          kind: "anniversary",
          today,
        }),
      });
      await queueNotification({
        organizationId,
        recipientUserId: userId,
        channel: "email",
        template: "celebration.notice",
        payload: { subject: "Happy work anniversary", message: "Happy work anniversary from BukuHR." },
        idempotencyKey: `${celebrationKey({
          organizationId,
          employeeId: employee.id as string,
          kind: "anniversary",
          today,
        })}:email`,
      });
    }

    if (notes.length > 0) {
      const current = digests.get(organizationId) ?? [];
      current.push(...notes);
      digests.set(organizationId, current);
    }
  }

  for (const [organizationId, notes] of digests) {
    const { data: members } = await admin
      .from("organization_memberships")
      .select("user_id, roles")
      .eq("organization_id", organizationId);
    const message = notes.join(". ");
    for (const member of members ?? []) {
      const roles = (member.roles ?? []) as string[];
      if (!roles.includes("hr_administrator") || !member.user_id) continue;
      await queueNotification({
        organizationId,
        recipientUserId: member.user_id as string,
        channel: "email",
        template: "celebration.notice",
        payload: { subject: "Today at work", message },
        idempotencyKey: celebrationKey({
          organizationId,
          employeeId: member.user_id as string,
          kind: "digest",
          today,
        }),
      });
      await queueNotification({
        organizationId,
        recipientUserId: member.user_id as string,
        channel: "in_app",
        template: "celebration.digest",
        payload: { message },
        idempotencyKey: `${celebrationKey({
          organizationId,
          employeeId: member.user_id as string,
          kind: "digest",
          today,
        })}:in_app`,
      });
    }
  }

  return { birthdays, anniversaries };
}
