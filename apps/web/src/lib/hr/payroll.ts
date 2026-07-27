import { requireRole } from "@/lib/auth/session";
import { generateDraftPayrun } from "@/lib/payroll/generate";
import { getPayrunDetail, listPayruns, type PayrunListItem } from "@/lib/payroll/queries";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type PayrunRow = PayrunListItem;

export { generateDraftPayrun as createDraftPayrun, getPayrunDetail, listPayruns };

export async function lockPayrun(payrunId: string, actorUserId: string): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data: payrun, error: fetchError } = await supabase
    .from("payroll_payruns")
    .select("status, period_year")
    .eq("id", payrunId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!payrun) throw new Error("Payrun not found.");
  if (payrun.status === "locked") return;
  if (payrun.status !== "approved") {
    throw new Error("Payrun must be approved before locking.");
  }

  const { error } = await supabase
    .from("payroll_payruns")
    .update({ status: "locked", locked_at: new Date().toISOString() })
    .eq("id", payrunId);

  if (error) throw new Error(error.message);

  await supabase.from("payroll_payrun_status_log").insert({
    payrun_id: payrunId,
    organization_id: organizationId,
    from_status: payrun.status,
    to_status: "locked",
    actor_user_id: actorUserId,
  });

  const { data: items } = await supabase
    .from("payroll_payrun_items")
    .select("employee_id, gross_pay, epf_employee, socso_employee, eis_employee, pcb")
    .eq("payrun_id", payrunId);

  for (const item of items ?? []) {
    const { data: existing } = await supabase
      .from("payroll_ytd_balances")
      .select("ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb")
      .eq("employee_id", item.employee_id)
      .eq("calendar_year", payrun.period_year)
      .maybeSingle();

    await supabase.from("payroll_ytd_balances").upsert(
      {
        organization_id: organizationId,
        employee_id: item.employee_id,
        calendar_year: payrun.period_year,
        ytd_gross: Number(existing?.ytd_gross ?? 0) + Number(item.gross_pay),
        ytd_epf_employee: Number(existing?.ytd_epf_employee ?? 0) + Number(item.epf_employee),
        ytd_socso_employee: Number(existing?.ytd_socso_employee ?? 0) + Number(item.socso_employee),
        ytd_eis_employee: Number(existing?.ytd_eis_employee ?? 0) + Number(item.eis_employee),
        ytd_pcb: Number(existing?.ytd_pcb ?? 0) + Number(item.pcb),
      },
      { onConflict: "employee_id,calendar_year" },
    );
  }
}
