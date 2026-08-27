import { createAdminClient } from "@/lib/supabase/admin";
import { queueNotification } from "@/lib/notifications/queue";

async function listOrganizationIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const deploymentMode = process.env.DEPLOYMENT_MODE ?? "standalone";
  const defaultOrgId = process.env.DEFAULT_ORGANIZATION_ID;

  if (deploymentMode === "standalone" && defaultOrgId) {
    return [defaultOrgId];
  }

  const { data, error } = await admin.from("organizations").select("id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.id);
}

async function queuePayslipsForOrganization(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  asOf: string,
): Promise<number> {
  const { data: payruns } = await admin
    .from("payroll_payruns")
    .select("id, period_year, period_month")
    .eq("organization_id", organizationId)
    .eq("status", "locked")
    .eq("pay_date", asOf);

  let queued = 0;
  for (const payrun of payruns ?? []) {
    const { data: items } = await admin
      .from("payroll_payrun_items")
      .select("id, employee_id")
      .eq("payrun_id", payrun.id);

    for (const item of items ?? []) {
      const { data: membership } = await admin
        .from("organization_memberships")
        .select("user_id")
        .eq("employee_id", item.employee_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      const userId = membership?.user_id;
      if (!userId) continue;

      await queueNotification({
        organizationId,
        recipientUserId: userId,
        channel: "email",
        template: "payroll.payslip_available",
        payload: {
          payrunId: payrun.id,
          itemId: item.id,
          periodYear: payrun.period_year,
          periodMonth: payrun.period_month,
          href: `/employee/payslips/${item.id}`,
          organizationId,
        },
        idempotencyKey: `payslip-email:${item.id}:${asOf}`,
      });
      queued += 1;
    }
  }

  return queued;
}

/** Queue payslip emails for locked payruns with pay_date = asOf (YYYY-MM-DD). */
export async function runPayslipEmailJob(asOf: string): Promise<number> {
  const admin = createAdminClient();
  const organizationIds = await listOrganizationIds(admin);

  let queued = 0;
  for (const organizationId of organizationIds) {
    queued += await queuePayslipsForOrganization(admin, organizationId, asOf);
  }

  return queued;
}
