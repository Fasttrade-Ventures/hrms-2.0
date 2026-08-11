import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { computeEmployeePayrun, lookupSocsoContribution, money } from "@hrms/domain";

import {
  buildIntegrationPayrunInput,
  createPayrollTestAdmin,
  ensurePayrollRulePacks,
  ensurePayrollTestEmployee,
  ensurePayrollTestOrganization,
  loadRuleContextFromDb,
  payrollIntegrationEnabled,
  upsertYtdFromLockedPayrun,
} from "./helpers/payroll-db";

const integrationEnabled = payrollIntegrationEnabled();

describe.skipIf(!integrationEnabled)("payroll lifecycle (postgres)", () => {
  let admin: ReturnType<typeof createPayrollTestAdmin>;
  let admin: SupabaseClient;
  let organizationId = "";
  let employeeId = "";
  let payrunId = "";

  beforeAll(async () => {
    admin = createPayrollTestAdmin();
    organizationId = await ensurePayrollTestOrganization(admin);
    await ensurePayrollRulePacks(admin);
    employeeId = await ensurePayrollTestEmployee(admin, organizationId);
  });

  afterAll(async () => {
    if (payrunId) {
      await admin.from("payroll_ytd_balances").delete().eq("employee_id", employeeId).eq("calendar_year", 2026);
      await admin.from("payroll_payrun_items").delete().eq("payrun_id", payrunId);
      await admin.from("payroll_payruns").delete().eq("id", payrunId);
    }
  });

  it("loads statutory rule packs from postgres", async () => {
    const context = await loadRuleContextFromDb(admin, "2026-01-31");
    const result = lookupSocsoContribution(money(7500), "cat1", context);
    expect(result.wageBand).toBe(6000);
    expect(result.employee.toNumber()).toBe(29.75);
  });

  it("runs draft → approved → locked and updates YTD", async () => {
    const rules = await loadRuleContextFromDb(admin, "2026-01-31");
    const result = computeEmployeePayrun({ ...buildIntegrationPayrunInput(), statutoryRules: rules });

    const { data: payrun, error: payrunError } = await admin
      .from("payroll_payruns")
      .insert({
        organization_id: organizationId,
        period_year: 2026,
        period_month: 1,
        earning_period_start: "2026-01-01",
        earning_period_end: "2026-01-31",
        pay_date: "2026-02-07",
        status: "draft",
        scope: "org_wide",
        payrun_type: "regular",
      })
      .select("id")
      .single();

    if (payrunError || !payrun) throw new Error(payrunError?.message ?? "Failed to create payrun.");
    payrunId = payrun.id;

    const { error: itemError } = await admin.from("payroll_payrun_items").insert({
      payrun_id: payrun.id,
      organization_id: organizationId,
      employee_id: employeeId,
      gross_pay: result.gross.toNumber(),
      epf_employee: result.epfEmployee.toNumber(),
      epf_employer: result.epfEmployer.toNumber(),
      socso_employee: result.socsoEmployee.toNumber(),
      socso_employer: result.socsoEmployer.toNumber(),
      eis_employee: result.eisEmployee.toNumber(),
      eis_employer: result.eisEmployer.toNumber(),
      pcb: result.pcb.toNumber(),
      net_pay: result.net.toNumber(),
      epf_wage_base: result.epfWageBase.toNumber(),
      socso_wage_base: result.socsoWageBase.toNumber(),
      pcb_wage_base: result.pcbWageBase.toNumber(),
      hrdf_employer: 0,
      requires_resolution: false,
    });

    if (itemError) throw new Error(itemError.message);

    await admin.from("payroll_payruns").update({ status: "approved" }).eq("id", payrun.id);
    await admin
      .from("payroll_payruns")
      .update({ status: "locked", locked_at: new Date().toISOString() })
      .eq("id", payrun.id);

    await upsertYtdFromLockedPayrun(admin, organizationId, payrun.id, 2026);

    const { data: ytd } = await admin
      .from("payroll_ytd_balances")
      .select("ytd_gross, ytd_epf_employee, ytd_pcb")
      .eq("employee_id", employeeId)
      .eq("calendar_year", 2026)
      .maybeSingle();

    expect(Number(ytd?.ytd_gross ?? 0)).toBeGreaterThanOrEqual(4000);
    expect(Number(ytd?.ytd_epf_employee ?? 0)).toBeGreaterThan(0);
  });
});
