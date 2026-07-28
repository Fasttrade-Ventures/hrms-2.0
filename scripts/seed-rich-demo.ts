/**
 * Seed rich demo data: full employee profiles, payroll history, attendance, leave, claims.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-rich-demo
 *
 * Options:
 *   --count <n>     Bulk staff to create (default: 45)
 *   --reset         Remove prior STAFF-* bulk employees and re-seed locked payruns
 */
import { computeEmployeePayrun, computeTp1AnnualReliefs, money } from "@hrms/domain";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  BANKS,
  basicSalary,
  CITIES,
  dateOfBirth,
  DEPARTMENT_NAMES,
  fullName,
  icNumber,
  JOIN_DATE,
  pad,
  phoneNumber,
  pick,
  RACES,
  RELIGIONS,
  SEED_TAG,
  STATES,
  weekdaysBetween,
} from "./seed-rich-demo-fixtures";

type BranchRow = { id: string; name: string };
type DepartmentRow = { id: string; name: string; branch_id: string };
type EmployeeRow = {
  id: string;
  full_name: string | null;
  employee_number: string | null;
  email: string;
  branch_id: string | null;
  department_id: string | null;
  manager_employee_id: string | null;
  pay_group_id: string | null;
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

function maritalProfile(index: number): {
  maritalStatus: string;
  spouseWorking: boolean;
  childCount: number;
} {
  const bucket = index % 5;
  if (bucket === 0) return { maritalStatus: "single", spouseWorking: false, childCount: 0 };
  if (bucket === 1) return { maritalStatus: "married", spouseWorking: true, childCount: 1 };
  if (bucket === 2) return { maritalStatus: "married", spouseWorking: false, childCount: 2 };
  if (bucket === 3) return { maritalStatus: "married", spouseWorking: true, childCount: 2 };
  return { maritalStatus: "divorced", spouseWorking: false, childCount: 1 };
}

async function ensureDepartments(
  admin: SupabaseClient,
  organizationId: string,
  branches: BranchRow[],
): Promise<DepartmentRow[]> {
  const rows: DepartmentRow[] = [];

  for (const branch of branches) {
    for (const name of DEPARTMENT_NAMES) {
      const { data: existing } = await admin
        .from("departments")
        .select("id, name, branch_id")
        .eq("organization_id", organizationId)
        .eq("branch_id", branch.id)
        .ilike("name", name)
        .maybeSingle();

      if (existing) {
        rows.push(existing);
        continue;
      }

      const { data: created, error } = await admin
        .from("departments")
        .insert({ organization_id: organizationId, branch_id: branch.id, name })
        .select("id, name, branch_id")
        .single();

      if (error || !created) throw new Error(error?.message ?? `Failed to create department ${name}`);
      rows.push(created);
    }
  }

  console.log(`Ensured ${rows.length} departments`);
  return rows;
}

async function ensurePayGroup(admin: SupabaseClient, organizationId: string): Promise<string> {
  const { data: existing } = await admin
    .from("pay_groups")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Monthly Staff")
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("pay_groups")
    .insert({
      organization_id: organizationId,
      name: "Monthly Staff",
      cycle: "monthly",
      cutoff_day: 6,
      is_default: true,
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Failed to create pay group");
  console.log("Created default pay group");
  return created.id;
}

async function resetBulkEmployees(admin: SupabaseClient, organizationId: string) {
  const { data: bulk } = await admin
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .like("employee_number", "STAFF-%");

  const ids = (bulk ?? []).map((row) => row.id);
  if (ids.length === 0) return;

  await admin.from("employees").delete().in("id", ids);
  console.log(`Removed ${ids.length} prior STAFF-* employees`);
}

async function resetPayruns(admin: SupabaseClient, organizationId: string) {
  const { data: targets } = await admin
    .from("payroll_payruns")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("period_year", 2026)
    .in("period_month", [5, 6, 7]);

  for (const payrun of targets ?? []) {
    await admin.from("payroll_payrun_items").delete().eq("payrun_id", payrun.id);
    await admin.from("payroll_payruns").delete().eq("id", payrun.id);
  }

  if ((targets ?? []).length > 0) {
    console.log(`Removed ${targets.length} prior May–Jul 2026 payruns`);
  }

  await admin
    .from("payroll_ytd_balances")
    .delete()
    .eq("organization_id", organizationId)
    .eq("calendar_year", 2026);
}

async function updateAllJoinDates(admin: SupabaseClient, organizationId: string) {
  const { error } = await admin
    .from("employees")
    .update({ join_date: JOIN_DATE })
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  console.log(`Set join_date=${JOIN_DATE} for all active employees`);
}

async function enrichEmployeeProfile(
  admin: SupabaseClient,
  organizationId: string,
  employee: EmployeeRow,
  index: number,
  branches: BranchRow[],
  departments: DepartmentRow[],
  payGroupId: string,
  managerId: string | null,
  leaveTypeIds: string[],
) {
  const salary = basicSalary(index);
  const branch = branches[index % branches.length];
  const branchDepartments = departments.filter((row) => row.branch_id === branch.id);
  const department = branchDepartments[index % branchDepartments.length] ?? departments[0];
  const marital = maritalProfile(index);
  const dob = dateOfBirth(index);
  const gender = index % 2 === 0 ? "male" : "female";

  await admin
    .from("employees")
    .update({
      join_date: JOIN_DATE,
      branch_id: branch.id,
      department_id: department?.id ?? null,
      manager_employee_id: managerId,
      pay_group_id: payGroupId,
      job_title: pick(
        [
          "Software Engineer",
          "HR Executive",
          "Accountant",
          "Sales Executive",
          "Operations Coordinator",
          "Admin Executive",
          "Customer Support Specialist",
        ],
        index,
      ),
      employment_type: index % 7 === 0 ? "contract" : "full_time",
      confirmation_status: index % 4 === 0 ? "probation" : "confirmed",
      annual_leave_entitlement: 14,
      annual_leave_carry_forward: index % 5 === 0 ? 2 : 0,
    })
    .eq("id", employee.id);

  await admin
    .from("employee_profiles")
    .upsert(
      {
        employee_id: employee.id,
        organization_id: organizationId,
        phone: phoneNumber(index),
        ic_number: icNumber(index),
        date_of_birth: dob,
        gender,
        race: pick(RACES, index),
        religion: pick(RELIGIONS, index),
        marital_status: marital.maritalStatus,
        address_line1: `${10 + (index % 90)} Jalan Demo ${index + 1}`,
        address_line2: index % 3 === 0 ? `Unit ${100 + index}` : null,
        city: pick(CITIES, index),
        state: pick(STATES, index),
        postcode: `${40000 + (index % 999)}`,
        country: "MY",
        pay_basis: "monthly",
        working_days_per_month: 21,
        basic_salary: salary,
        bank_name: pick(BANKS, index),
        bank_account_number: `${pad(index + 1, 10)}${pad(index, 2)}`,
        epf_number: `EPF${pad(index + 1, 8)}`,
        socso_number: `SOCSO${pad(index + 1, 7)}`,
        tax_number: `SG${pad(index + 1, 9)}`,
        epf_employee_rate: 11,
        epf_employer_rate: 13,
        eis_eligible: true,
      },
      { onConflict: "employee_id" },
    );

  await admin.from("employee_compensation").upsert(
    {
      organization_id: organizationId,
      employee_id: employee.id,
      pay_basis: "monthly",
      basic_salary: salary,
      voluntary_epf_extra_rate: index % 9 === 0 ? 3 : 0,
    },
    { onConflict: "employee_id" },
  );

  await admin.from("employee_tax_profiles").upsert(
    {
      organization_id: organizationId,
      employee_id: employee.id,
      marital_status: marital.maritalStatus,
      spouse_working: marital.spouseWorking,
      zakat_annual: index % 11 === 0 ? 500 : 0,
      zakat_monthly: 0,
      tp1_payload: { otherReliefs: index % 13 === 0 ? 1000 : 0, demoSeed: SEED_TAG },
    },
    { onConflict: "employee_id" },
  );

  await admin.from("employee_dependents").delete().eq("employee_id", employee.id);
  const dependents: Array<Record<string, unknown>> = [];

  if (marital.maritalStatus === "married") {
    dependents.push({
      organization_id: organizationId,
      employee_id: employee.id,
      dependent_type: "spouse",
      full_name: `Spouse of ${employee.full_name ?? "Employee"}`,
      ic_number: icNumber(index + 500),
      is_working: marital.spouseWorking,
      date_of_birth: dateOfBirth(index + 20),
    });
  }

  for (let child = 0; child < marital.childCount; child += 1) {
    dependents.push({
      organization_id: organizationId,
      employee_id: employee.id,
      dependent_type: "child",
      full_name: `Child ${child + 1} ${employee.full_name?.split(" ")[0] ?? "Demo"}`,
      ic_number: icNumber(index + 700 + child),
      is_working: false,
      date_of_birth: dateOfBirth(index + 30 + child),
    });
  }

  if (dependents.length > 0) {
    await admin.from("employee_dependents").insert(dependents);
  }

  await admin.from("employee_emergency_contacts").delete().eq("employee_id", employee.id);
  await admin.from("employee_emergency_contacts").insert([
    {
      organization_id: organizationId,
      employee_id: employee.id,
      name: `Emergency Contact ${index + 1}`,
      relationship: index % 2 === 0 ? "Parent" : "Sibling",
      phone: phoneNumber(index + 1000),
    },
    {
      organization_id: organizationId,
      employee_id: employee.id,
      name: `Secondary Contact ${index + 1}`,
      relationship: "Friend",
      phone: phoneNumber(index + 2000),
    },
  ]);

  await admin.from("employee_allowed_leave_types").delete().eq("employee_id", employee.id);
  if (leaveTypeIds.length > 0) {
    await admin.from("employee_allowed_leave_types").insert(
      leaveTypeIds.map((leaveTypeId) => ({
        organization_id: organizationId,
        employee_id: employee.id,
        leave_type_id: leaveTypeId,
      })),
    );
  }
}

async function createBulkEmployees(
  admin: SupabaseClient,
  organizationId: string,
  count: number,
  branches: BranchRow[],
  departments: DepartmentRow[],
  payGroupId: string,
  managerId: string | null,
  leaveTypeIds: string[],
): Promise<number> {
  let created = 0;

  for (let index = 0; index < count; index += 1) {
    const employeeNumber = `STAFF-${pad(index + 1, 4)}`;
    const email = `staff${pad(index + 1, 4)}@demo.hrms.local`;

    const { data: existing } = await admin
      .from("employees")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("employee_number", employeeNumber)
      .maybeSingle();

    if (existing) continue;

    const name = fullName(index);
    const branch = branches[index % branches.length];
    const branchDepartments = departments.filter((row) => row.branch_id === branch.id);
    const department = branchDepartments[index % branchDepartments.length] ?? departments[0];

    const { data: employee, error } = await admin
      .from("employees")
      .insert({
        organization_id: organizationId,
        employee_number: employeeNumber,
        full_name: name,
        email,
        status: "active",
        join_date: JOIN_DATE,
        branch_id: branch.id,
        department_id: department?.id ?? null,
        manager_employee_id: managerId,
        pay_group_id: payGroupId,
        job_title: pick(
          [
            "Software Engineer",
            "QA Engineer",
            "Business Analyst",
            "Accountant",
            "Sales Executive",
            "Marketing Executive",
            "Operations Coordinator",
          ],
          index,
        ),
        employment_type: index % 8 === 0 ? "contract" : "full_time",
        confirmation_status: index % 5 === 0 ? "probation" : "confirmed",
        annual_leave_entitlement: 14,
      })
      .select("id, full_name, employee_number, email, branch_id, department_id, manager_employee_id, pay_group_id")
      .single();

    if (error || !employee) {
      console.warn(`Skip ${employeeNumber}: ${error?.message}`);
      continue;
    }

    await admin.from("employee_profiles").insert({
      employee_id: employee.id,
      organization_id: organizationId,
    });

    await enrichEmployeeProfile(
      admin,
      organizationId,
      employee,
      index + 100,
      branches,
      departments,
      payGroupId,
      managerId,
      leaveTypeIds,
    );

    created += 1;
  }

  console.log(`Created ${created} bulk STAFF-* employees`);
  return created;
}

async function seedAttendanceHistory(admin: SupabaseClient, organizationId: string, employeeIds: string[]) {
  const dates = weekdaysBetween("2026-05-01", "2026-07-25");
  let rows = 0;

  for (const employeeId of employeeIds) {
    const hash = employeeId.charCodeAt(0) + employeeId.charCodeAt(1);
    for (const workDate of dates) {
      if ((hash + workDate.charCodeAt(8)) % 17 === 0) continue;

      const lateMinutes = (hash + Number(workDate.slice(-2))) % 5 === 0 ? 15 : 0;
      const clockIn = new Date(`${workDate}T08:${pad(30 + lateMinutes, 2)}:00+08:00`);
      const clockOut = new Date(`${workDate}T17:${pad((hash % 30) + 30, 2)}:00+08:00`);
      const isToday = workDate === new Date().toISOString().slice(0, 10);
      const status = lateMinutes > 0 ? "late" : "present";

      await admin.from("attendance_records").upsert(
        {
          organization_id: organizationId,
          employee_id: employeeId,
          work_date: workDate,
          session: 1,
          clock_in_at: clockIn.toISOString(),
          clock_out_at: isToday ? null : clockOut.toISOString(),
          status,
        },
        { onConflict: "organization_id,employee_id,work_date,session" },
      );
      rows += 1;
    }
  }

  console.log(`Seeded ${rows} attendance records (May–Jul 2026)`);
}

async function seedLeaveAndClaims(
  admin: SupabaseClient,
  organizationId: string,
  employees: EmployeeRow[],
  leaveTypes: Array<{ id: string; name: string }>,
  claimTypeId: string,
) {
  const annualLeave = leaveTypes.find((row) => row.name === "Annual Leave")?.id;
  const medicalLeave = leaveTypes.find((row) => row.name === "Medical Leave")?.id;
  if (!annualLeave || !medicalLeave) return;

  let leaveCount = 0;
  let claimCount = 0;

  for (const [index, employee] of employees.entries()) {
    if (index % 4 === 0) {
      const { error } = await admin.from("leave_requests").insert({
        organization_id: organizationId,
        employee_id: employee.id,
        leave_type_id: annualLeave,
        start_date: `2026-06-${pad((index % 20) + 1, 2)}`,
        end_date: `2026-06-${pad((index % 20) + 2, 2)}`,
        days: 2,
        reason: "Family trip",
        status: index % 8 === 0 ? "pending" : "approved",
      });
      if (!error) leaveCount += 1;
    }

    if (index % 5 === 0) {
      const { error } = await admin.from("leave_requests").insert({
        organization_id: organizationId,
        employee_id: employee.id,
        leave_type_id: medicalLeave,
        start_date: `2026-07-${pad((index % 15) + 1, 2)}`,
        end_date: `2026-07-${pad((index % 15) + 1, 2)}`,
        days: 1,
        reason: "Medical appointment",
        status: "approved",
      });
      if (!error) leaveCount += 1;
    }

    if (index % 6 === 0) {
      const { error } = await admin.from("claims").insert({
        organization_id: organizationId,
        employee_id: employee.id,
        claim_type_id: claimTypeId,
        amount: 80 + (index % 5) * 20,
        receipt_date: `2026-07-${pad((index % 20) + 1, 2)}`,
        description: "Client visit transport",
        status: index % 9 === 0 ? "pending" : "approved",
      });
      if (!error) claimCount += 1;
    }

    if (index % 7 === 0) {
      await admin.from("overtime_requests").insert({
        organization_id: organizationId,
        employee_id: employee.id,
        work_date: `2026-07-${pad((index % 18) + 1, 2)}`,
        hours: 2 + (index % 3),
        rate_type: "1.5",
        reason: "Project deadline",
        status: index % 10 === 0 ? "pending" : "approved",
      });
    }
  }

  console.log(`Seeded ${leaveCount} leave requests and ${claimCount} claims`);
}

async function computePayrunItem(
  admin: SupabaseClient,
  organizationId: string,
  employeeId: string,
  asOf: string,
  ytd: {
    ytd_gross: number;
    ytd_epf_employee: number;
    ytd_socso_employee: number;
    ytd_eis_employee: number;
    ytd_pcb: number;
  } | null,
) {
  const { data: employee, error } = await admin
    .from("employees")
    .select(
      `id, branch_id,
       employee_profiles(basic_salary, epf_employee_rate, epf_employer_rate, eis_eligible, date_of_birth, marital_status, is_foreign_worker),
       employee_compensation(voluntary_epf_extra_rate, socso_category_override, basic_salary),
       employee_tax_profiles(marital_status, spouse_working, zakat_annual, zakat_monthly, tp1_payload),
       employee_dependents(dependent_type)`,
    )
    .eq("id", employeeId)
    .single();

  if (error || !employee) throw new Error(error?.message ?? "Employee not found for payroll");

  const profile = Array.isArray(employee.employee_profiles)
    ? employee.employee_profiles[0]
    : employee.employee_profiles;
  const compensation = Array.isArray(employee.employee_compensation)
    ? employee.employee_compensation[0]
    : employee.employee_compensation;
  const taxProfile = Array.isArray(employee.employee_tax_profiles)
    ? employee.employee_tax_profiles[0]
    : employee.employee_tax_profiles;
  const dependents = employee.employee_dependents ?? [];
  const childCount = dependents.filter((row: { dependent_type: string }) => row.dependent_type === "child").length;
  const maritalStatus = taxProfile?.marital_status ?? profile?.marital_status ?? null;
  const reliefs = computeTp1AnnualReliefs({
    maritalStatus,
    spouseWorking: taxProfile?.spouse_working ?? null,
    childCount,
  });

  const { data: branch } = employee.branch_id
    ? await admin
        .from("branches")
        .select("hrdf_enabled, hrdf_rate, lindung_enabled, lindung_employer_rate, epf_wage_rounding")
        .eq("id", employee.branch_id)
        .maybeSingle()
    : { data: null };

  const basic = Number(compensation?.basic_salary ?? profile?.basic_salary ?? 0);
  const result = computeEmployeePayrun({
    lines: [
      {
        code: "BASIC",
        amount: money(basic),
        flags: { isEpf: true, isSocso: true, isEis: true, isPcb: true, isHrdf: true },
      },
    ],
    dateOfBirth: profile?.date_of_birth ?? "1990-01-01",
    asOf,
    eisEligible: profile?.eis_eligible ?? true,
    epfEmployeeRate: Number(profile?.epf_employee_rate ?? 11),
    epfEmployerRate: Number(profile?.epf_employer_rate ?? 13),
    voluntaryEpfExtraRate: Number(compensation?.voluntary_epf_extra_rate ?? 0),
    frequency: "monthly",
    ytd: {
      gross: money(String(ytd?.ytd_gross ?? 0)),
      epf: money(String(ytd?.ytd_epf_employee ?? 0)),
      pcb: money(String(ytd?.ytd_pcb ?? 0)),
      socso: money(String(ytd?.ytd_socso_employee ?? 0)),
      eis: money(String(ytd?.ytd_eis_employee ?? 0)),
    },
    tp1: {
      zakatAnnual: money(String(taxProfile?.zakat_annual ?? 0)),
      spouse: reliefs.spouse,
      children: reliefs.children,
      other: money(String((taxProfile?.tp1_payload as { otherReliefs?: number } | null)?.otherReliefs ?? 0)),
    },
    zakatMonthly: money(String(taxProfile?.zakat_monthly ?? 0)),
    hrdfEnabled: Boolean(branch?.hrdf_enabled),
    hrdfRate: Number(branch?.hrdf_rate ?? 0.01),
    lindungEnabled: Boolean(branch?.lindung_enabled),
    lindungRate: 0.0075,
    lindungEmployerRate: Number(branch?.lindung_employer_rate ?? 0),
    epfWageRounding: branch?.epf_wage_rounding === "ceil_rm50" ? "ceil_rm50" : "none",
    isForeignWorker: Boolean(profile?.is_foreign_worker),
    maritalCategory: maritalStatus === "married" ? "married" : "single",
  });

  return { result, branchId: employee.branch_id as string | null };
}

async function seedLockedPayruns(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const periods = [
    { month: 5, start: "2026-05-01", end: "2026-05-31", payDate: "2026-06-05" },
    { month: 6, start: "2026-06-01", end: "2026-06-30", payDate: "2026-07-05" },
    { month: 7, start: "2026-07-01", end: "2026-07-31", payDate: "2026-08-05" },
  ];

  const ytdMap = new Map<string, {
    ytd_gross: number;
    ytd_epf_employee: number;
    ytd_socso_employee: number;
    ytd_eis_employee: number;
    ytd_pcb: number;
  }>();

  for (const period of periods) {
    const { data: existing } = await admin
      .from("payroll_payruns")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("period_year", 2026)
      .eq("period_month", period.month)
      .maybeSingle();

    if (existing?.status === "locked") {
      console.log(`Payrun ${period.month}/2026 already locked — skipping`);
      continue;
    }

    if (existing) {
      await admin.from("payroll_payrun_items").delete().eq("payrun_id", existing.id);
      await admin.from("payroll_payruns").delete().eq("id", existing.id);
    }

    const { data: payrun, error: payrunError } = await admin
      .from("payroll_payruns")
      .insert({
        organization_id: organizationId,
        period_year: 2026,
        period_month: period.month,
        earning_period_start: period.start,
        earning_period_end: period.end,
        pay_date: period.payDate,
        status: "locked",
        locked_at: new Date(`${period.payDate}T10:00:00+08:00`).toISOString(),
        scope: "org_wide",
        payrun_type: "regular",
      })
      .select("id")
      .single();

    if (payrunError || !payrun) throw new Error(payrunError?.message ?? "Failed to create payrun");

    for (const employee of employees) {
      const ytd = ytdMap.get(employee.id) ?? null;
      const { result, branchId } = await computePayrunItem(admin, organizationId, employee.id, period.end, ytd);

      await admin.from("payroll_payrun_items").insert({
        payrun_id: payrun.id,
        organization_id: organizationId,
        employee_id: employee.id,
        branch_id: branchId,
        gross_pay: result.gross.toFixed(2),
        statutory_wage_base: result.epfWageBase.toFixed(2),
        epf_wage_base: result.epfWageBase.toFixed(2),
        socso_wage_base: result.socsoWageBase.toFixed(2),
        pcb_wage_base: result.pcbWageBase.toFixed(2),
        epf_employee: result.epfEmployee.toFixed(2),
        epf_employer: result.epfEmployer.toFixed(2),
        socso_employee: result.socsoEmployee.toFixed(2),
        socso_employer: result.socsoEmployer.toFixed(2),
        eis_employee: result.eisEmployee.toFixed(2),
        eis_employer: result.eisEmployer.toFixed(2),
        pcb: result.pcb.toFixed(2),
        hrdf_employer: result.hrdfEmployer.toFixed(2),
        lindung_employee: result.lindungEmployee.toFixed(2),
        lindung_employer: result.lindungEmployer.toFixed(2),
        net_pay: result.net.toFixed(2),
        requires_resolution: result.requiresResolution,
        anomaly_flags: result.anomalyFlags,
      });

      const nextYtd = {
        ytd_gross: Number(ytd?.ytd_gross ?? 0) + result.gross.toNumber(),
        ytd_epf_employee: Number(ytd?.ytd_epf_employee ?? 0) + result.epfEmployee.toNumber(),
        ytd_socso_employee: Number(ytd?.ytd_socso_employee ?? 0) + result.socsoEmployee.toNumber(),
        ytd_eis_employee: Number(ytd?.ytd_eis_employee ?? 0) + result.eisEmployee.toNumber(),
        ytd_pcb: Number(ytd?.ytd_pcb ?? 0) + result.pcb.toNumber(),
      };
      ytdMap.set(employee.id, nextYtd);
    }

    console.log(`Locked payrun ${period.month}/2026 with ${employees.length} employees`);
  }

  for (const [employeeId, balances] of ytdMap.entries()) {
    await admin.from("payroll_ytd_balances").upsert(
      {
        organization_id: organizationId,
        employee_id: employeeId,
        calendar_year: 2026,
        ...balances,
        ytd_zakat: 0,
        opening_balance: false,
      },
      { onConflict: "employee_id,calendar_year" },
    );
  }

  console.log(`Updated YTD balances for ${ytdMap.size} employees`);
}

async function main() {
  const count = Number(getArg("--count") ?? "45");
  const reset = hasFlag("--reset");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = getOrganizationId();

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (reset) {
    await resetBulkEmployees(admin, organizationId);
    await resetPayruns(admin, organizationId);
  }

  const { data: branches, error: branchError } = await admin
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (branchError || !branches?.length) {
    throw new Error(branchError?.message ?? "No branches found — create branches first");
  }

  const departments = await ensureDepartments(admin, organizationId, branches);
  const payGroupId = await ensurePayGroup(admin, organizationId);
  await updateAllJoinDates(admin, organizationId);

  const { data: leaveTypes } = await admin
    .from("leave_types")
    .select("id, name")
    .eq("organization_id", organizationId);

  const leaveTypeIds = (leaveTypes ?? []).map((row) => row.id);
  const claimTypeId =
    (leaveTypes ?? []).length > 0
      ? (
          await admin
            .from("claim_types")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("name", "Transport")
            .maybeSingle()
        ).data?.id
      : null;

  if (!claimTypeId) {
    console.error("Run pnpm seed-org-catalogs first");
    process.exit(1);
  }

  const { data: employees, error: employeesError } = await admin
    .from("employees")
    .select("id, full_name, employee_number, email, branch_id, department_id, manager_employee_id, pay_group_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("employee_number");

  if (employeesError || !employees?.length) {
    throw new Error(employeesError?.message ?? "No active employees found");
  }

  const manager =
    employees.find((row) => row.employee_number?.includes("MGR")) ??
    employees.find((row) => row.full_name?.toLowerCase().includes("manager")) ??
    null;

  for (const [index, employee] of employees.entries()) {
    await enrichEmployeeProfile(
      admin,
      organizationId,
      employee,
      index,
      branches,
      departments,
      payGroupId,
      employee.id === manager?.id ? null : manager?.id ?? null,
      leaveTypeIds,
    );
  }

  console.log(`Enriched ${employees.length} existing employees with full profiles`);

  await createBulkEmployees(
    admin,
    organizationId,
    count,
    branches,
    departments,
    payGroupId,
    manager?.id ?? null,
    leaveTypeIds,
  );

  const { data: allEmployees } = await admin
    .from("employees")
    .select("id, full_name, employee_number, email, branch_id, department_id, manager_employee_id, pay_group_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("employee_number");

  const roster = allEmployees ?? [];
  await seedAttendanceHistory(
    admin,
    organizationId,
    roster.map((row) => row.id),
  );
  await seedLeaveAndClaims(admin, organizationId, roster, leaveTypes ?? [], claimTypeId);
  await seedLockedPayruns(admin, organizationId, roster);

  console.log(`\nRich demo seed complete — ${roster.length} active employees, join date ${JOIN_DATE}`);
  console.log("Run pnpm seed-demo-data for approvals, documents, and recruitment extras.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
