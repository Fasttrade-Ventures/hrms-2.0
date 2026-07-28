import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  buildStatutoryRuleContextFromPacks,
  money,
  SOCSO_CAT1_BANDS,
  SOCSO_CAT2_BANDS,
} from "@hrms/domain";
import { TEST_ORGANIZATION_ID } from "@hrms/testkit";

export function payrollIntegrationEnabled(): boolean {
  return (
    process.env.PAYROLL_INTEGRATION === "1" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function createPayrollTestAdmin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getPayrollTestOrganizationId(): string {
  return process.env.DEFAULT_ORGANIZATION_ID ?? TEST_ORGANIZATION_ID;
}

export async function ensurePayrollTestOrganization(admin: SupabaseClient): Promise<string> {
  const organizationId = getPayrollTestOrganizationId();
  await admin.from("organizations").upsert({
    id: organizationId,
    name: "Payroll Integration Test Org",
    slug: `payroll-integration-${organizationId.slice(0, 8)}`,
    product_tier: "enterprise",
  });
  return organizationId;
}

export async function ensurePayrollRulePacks(admin: SupabaseClient): Promise<void> {
  const { count } = await admin
    .from("statutory_rule_versions")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) > 0) return;

  const mapBands = (bands: readonly { max: number; ee: number; er: number }[]) =>
    bands.map((band) => ({ maxWage: band.max, employee: band.ee, employer: band.er }));

  const packs = [
    {
      rule_set: "perkeso_socso_cat1",
      effective_from: "2024-10-01",
      payload: { bands: mapBands(SOCSO_CAT1_BANDS) },
    },
    {
      rule_set: "perkeso_socso_cat2",
      effective_from: "2024-10-01",
      payload: { bands: mapBands(SOCSO_CAT2_BANDS) },
    },
    {
      rule_set: "eis_malaysia",
      effective_from: "2024-10-01",
      payload: { employeeRate: 0.002, employerRate: 0.002, wageCeiling: 6000 },
    },
    {
      rule_set: "epf_malaysia",
      effective_from: "2025-10-01",
      payload: { defaultEmployeeRate: 11, defaultEmployerRate: 13 },
    },
    {
      rule_set: "pcb_mtd_malaysia",
      effective_from: "2026-01-01",
      payload: { taxYear: 2026, method: "computerised" },
    },
  ];

  const { error } = await admin.from("statutory_rule_versions").insert(packs);
  if (error) throw new Error(error.message);
}

export async function loadRuleContextFromDb(admin: SupabaseClient, asOf: string) {
  const { data, error } = await admin
    .from("statutory_rule_versions")
    .select("rule_set, payload, effective_from")
    .lte("effective_from", asOf)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  const seen = new Set<string>();
  const packs: Array<{ ruleSet: string; payload: Record<string, unknown> }> = [];
  for (const row of data ?? []) {
    if (seen.has(row.rule_set)) continue;
    seen.add(row.rule_set);
    packs.push({ ruleSet: row.rule_set, payload: (row.payload as Record<string, unknown>) ?? {} });
  }

  return buildStatutoryRuleContextFromPacks(packs);
}

export async function ensurePayrollTestEmployee(admin: SupabaseClient, organizationId: string): Promise<string> {
  const { data: existing } = await admin
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("employee_number", "PAYROLL-INT-001")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: employee, error } = await admin
    .from("employees")
    .insert({
      organization_id: organizationId,
      employee_number: "PAYROLL-INT-001",
      full_name: "Payroll Integration Employee",
      email: "payroll.integration@example.com",
      status: "active",
      join_date: "2024-01-01",
      job_title: "Engineer",
    })
    .select("id")
    .single();

  if (error || !employee) throw new Error(error?.message ?? "Failed to create test employee.");

  await admin.from("employee_profiles").upsert({
    organization_id: organizationId,
    employee_id: employee.id,
    basic_salary: 4000,
    epf_employee_rate: 11,
    epf_employer_rate: 13,
    eis_eligible: true,
    date_of_birth: "1990-01-01",
  });

  return employee.id;
}

export async function upsertYtdFromLockedPayrun(
  admin: SupabaseClient,
  organizationId: string,
  payrunId: string,
  calendarYear: number,
): Promise<void> {
  const { data: items } = await admin
    .from("payroll_payrun_items")
    .select("employee_id, gross_pay, epf_employee, socso_employee, eis_employee, pcb")
    .eq("payrun_id", payrunId);

  for (const item of items ?? []) {
    const { data: existing } = await admin
      .from("payroll_ytd_balances")
      .select("ytd_gross, ytd_epf_employee, ytd_socso_employee, ytd_eis_employee, ytd_pcb")
      .eq("employee_id", item.employee_id)
      .eq("calendar_year", calendarYear)
      .maybeSingle();

    await admin.from("payroll_ytd_balances").upsert(
      {
        organization_id: organizationId,
        employee_id: item.employee_id,
        calendar_year: calendarYear,
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

export function buildIntegrationPayrunInput() {
  return {
    lines: [
      {
        code: "BASIC",
        amount: money(4000),
        flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: false },
      },
    ],
    dateOfBirth: "1990-01-01",
    asOf: "2026-01-31",
    eisEligible: true,
    epfEmployeeRate: 11,
    epfEmployerRate: 13,
    voluntaryEpfExtraRate: 0,
    frequency: "monthly" as const,
    ytd: { gross: money(0), epf: money(0), pcb: money(0) },
    tp1: { zakatAnnual: money(0), spouse: money(0), children: money(0), other: money(0) },
    zakatMonthly: money(0),
    hrdfEnabled: false,
    hrdfRate: 0,
    lindungEnabled: false,
    lindungRate: 0,
    lindungEmployerRate: 0,
  };
}
