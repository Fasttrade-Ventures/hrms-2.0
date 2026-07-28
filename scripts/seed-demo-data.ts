/**
 * Seed realistic demo data for the standalone org so HR dashboards use live metrics.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-demo-data
 *
 * Options:
 *   --reset   Remove previously seeded demo approval requests before re-seeding
 */
import { createHash } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEMO_TAG = "demo_seed_v1";

type EmployeeRow = {
  id: string;
  full_name: string | null;
  employee_number: string | null;
  branch_id: string | null;
  manager_employee_id: string | null;
};

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function hashKey(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

async function createPendingApproval(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    requesterEmployeeId: string;
    approverEmployeeId: string | null;
    requestType: string;
    payload: Record<string, unknown>;
    sourceTable: string;
    sourceRow: Record<string, unknown>;
  },
): Promise<void> {
  const { data: source, error: sourceError } = await admin
    .from(input.sourceTable)
    .insert({ organization_id: input.organizationId, ...input.sourceRow, status: "draft" })
    .select("id")
    .single();

  if (sourceError || !source) throw new Error(sourceError?.message ?? `Failed to seed ${input.sourceTable}`);

  const submittedAt = new Date(Date.now() - Math.floor(Math.random() * 72) * 60 * 60 * 1000).toISOString();

  const { data: request, error: requestError } = await admin
    .from("approval_requests")
    .insert({
      organization_id: input.organizationId,
      request_type: input.requestType,
      requester_employee_id: input.requesterEmployeeId,
      status: "pending",
      payload: { ...input.payload, demoSeed: DEMO_TAG, sourceTable: input.sourceTable, sourceId: source.id },
      submitted_at: submittedAt,
    })
    .select("id")
    .single();

  if (requestError || !request) throw new Error(requestError?.message ?? "Failed to seed approval request");

  await admin.from("approval_steps").insert({
    approval_request_id: request.id,
    organization_id: input.organizationId,
    step_order: 1,
    approver_employee_id: input.approverEmployeeId,
    status: "pending",
  });

  await admin
    .from(input.sourceTable)
    .update({ approval_request_id: request.id, status: "pending" })
    .eq("id", source.id);
}

async function seedBranchAssignments(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const { data: branches } = await admin
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");

  if (!branches?.length) return;

  const primaryBranchId = branches[0].id;
  const branchAdmins = employees.filter(
    (employee) =>
      employee.employee_number?.includes("BRN") || employee.full_name?.toLowerCase().includes("branch admin"),
  );

  for (const adminEmployee of branchAdmins) {
    await admin
      .from("employees")
      .update({ branch_id: primaryBranchId })
      .eq("id", adminEmployee.id);
    adminEmployee.branch_id = primaryBranchId;
  }

  for (const employee of employees) {
    if (!employee.branch_id) {
      const branchId = branches[employees.indexOf(employee) % branches.length].id;
      await admin.from("employees").update({ branch_id: branchId }).eq("id", employee.id);
      employee.branch_id = branchId;
    }
  }

  console.log(`Assigned employees across ${branches.length} branches`);
}

async function seedReportingLines(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const manager =
    employees.find((e) => e.employee_number?.includes("MGR")) ??
    employees.find((e) => e.full_name?.toLowerCase().includes("manager"));

  if (!manager) {
    console.log("No manager employee found — skipping reporting lines");
    return null;
  }

  for (const employee of employees) {
    if (employee.id === manager.id) continue;
    if (employee.manager_employee_id) continue;
    await admin.from("employees").update({ manager_employee_id: manager.id }).eq("id", employee.id);
    employee.manager_employee_id = manager.id;
  }

  console.log(`Assigned ${manager.full_name ?? manager.employee_number} as manager for direct reports`);
  return manager.id;
}

async function seedSalaries(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const salaries = [3200, 3500, 4000, 4200, 4500, 4800, 5000, 5200, 5500, 6000, 6500, 7000, 8000];
  let index = 0;

  for (const employee of employees) {
    const basicSalary = salaries[index % salaries.length];
    index += 1;

    await admin
      .from("employee_profiles")
      .update({ basic_salary: basicSalary })
      .eq("employee_id", employee.id);

    await admin.from("employee_compensation").upsert(
      {
        organization_id: organizationId,
        employee_id: employee.id,
        pay_basis: "monthly",
        basic_salary: basicSalary,
      },
      { onConflict: "employee_id" },
    );
  }

  console.log(`Updated basic salaries for ${employees.length} employees`);
}

async function seedDocuments(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const { data: requiredDocs } = await admin
    .from("required_documents")
    .select("id, name, requires_expiry")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (!requiredDocs?.length) {
    console.log("No required document types — skipping document seed");
    return;
  }

  let created = 0;
  for (const employee of employees) {
    for (const docType of requiredDocs) {
      const { data: existing } = await admin
        .from("employee_documents")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("employee_id", employee.id)
        .ilike("document_type", docType.name)
        .maybeSingle();

      if (existing) continue;

      const storageKey = `demo/${organizationId}/${employee.id}/${docType.name.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      const { data: file, error: fileError } = await admin
        .from("file_objects")
        .insert({
          organization_id: organizationId,
          category: "employee_document",
          storage_key: storageKey,
          bucket: "hrmsinternal",
          file_name: `${docType.name}.pdf`,
          content_type: "application/pdf",
          byte_size: 1024,
          sha256: hashKey(storageKey),
        })
        .select("id")
        .single();

      if (fileError || !file) {
        console.warn(`file_objects: ${fileError?.message}`);
        continue;
      }

      const expiresAt = docType.requires_expiry
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;

      const { error: docError } = await admin.from("employee_documents").insert({
        organization_id: organizationId,
        employee_id: employee.id,
        document_type: docType.name,
        file_id: file.id,
        expires_at: expiresAt,
      });

      if (!docError) created += 1;
    }
  }

  console.log(`Seeded ${created} employee documents`);
}

async function seedApprovals(
  admin: SupabaseClient,
  organizationId: string,
  employees: EmployeeRow[],
  leaveTypeId: string,
  claimTypeId: string,
) {
  const candidates = employees.filter((e) => e.manager_employee_id);
  const samples = candidates.slice(0, Math.min(6, candidates.length));

  const scenarios: Array<{
    type: string;
    table: string;
    payload: Record<string, unknown>;
    row: Record<string, unknown>;
  }> = [
    {
      type: "leave",
      table: "leave_requests",
      payload: { leaveTypeName: "Annual Leave", days: 2 },
      row: {
        employee_id: "",
        leave_type_id: leaveTypeId,
        start_date: "2026-08-04",
        end_date: "2026-08-05",
        days: 2,
        reason: "Family event",
      },
    },
    {
      type: "claim",
      table: "claims",
      payload: { amount: 240, claimType: "Transport" },
      row: {
        employee_id: "",
        claim_type_id: claimTypeId,
        amount: 240,
        receipt_date: "2026-07-20",
        description: "Client visit travel",
      },
    },
    {
      type: "overtime",
      table: "overtime_requests",
      payload: { hours: 3.5 },
      row: {
        employee_id: "",
        work_date: "2026-07-22",
        hours: 3.5,
        rate_type: "1.5",
        reason: "Month-end closing",
      },
    },
    {
      type: "late",
      table: "late_requests",
      payload: { requestDate: "2026-07-27" },
      row: {
        employee_id: "",
        request_date: "2026-07-27",
        actual_arrival_time: "09:12:00",
        reason: "Traffic on highway",
      },
    },
    {
      type: "leave",
      table: "leave_requests",
      payload: { leaveTypeName: "Medical Leave", days: 2 },
      row: {
        employee_id: "",
        leave_type_id: leaveTypeId,
        start_date: "2026-07-29",
        end_date: "2026-07-30",
        days: 2,
        reason: "Medical rest",
      },
    },
    {
      type: "attendance",
      table: "attendance_requests",
      payload: { requestDate: "2026-07-26" },
      row: {
        employee_id: "",
        request_date: "2026-07-26",
        clock_in_time: "09:00:00",
        clock_out_time: "18:00:00",
        hours: 8,
        reason: "Forgot to clock in",
      },
    },
  ];

  for (let i = 0; i < samples.length; i += 1) {
    const employee = samples[i];
    const scenario = scenarios[i % scenarios.length];
    await createPendingApproval(admin, {
      organizationId,
      requesterEmployeeId: employee.id,
      approverEmployeeId: employee.manager_employee_id,
      requestType: scenario.type,
      payload: scenario.payload,
      sourceTable: scenario.table,
      sourceRow: { ...scenario.row, employee_id: employee.id },
    });
  }

  console.log(`Seeded ${samples.length} pending approval requests`);
}

async function seedAttendanceToday(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const clockedIn = employees.slice(0, Math.min(10, employees.length));

  for (const employee of clockedIn) {
    const clockIn = new Date();
    clockIn.setHours(8, 45 + Math.floor(Math.random() * 30), 0, 0);

    await admin.from("attendance_records").upsert(
      {
        organization_id: organizationId,
        employee_id: employee.id,
        work_date: today,
        session: 1,
        clock_in_at: clockIn.toISOString(),
        status: "present",
      },
      { onConflict: "organization_id,employee_id,work_date,session" },
    );
  }

  console.log(`Seeded attendance for ${clockedIn.length} employees today`);
}

async function seedPerformance(admin: SupabaseClient, organizationId: string, employees: EmployeeRow[]) {
  const { data: existing } = await admin
    .from("review_cycles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "H1 2026 Performance Review")
    .maybeSingle();

  let cycleId = existing?.id;
  if (!cycleId) {
    const { data: cycle, error } = await admin
      .from("review_cycles")
      .insert({
        organization_id: organizationId,
        name: "H1 2026 Performance Review",
        period_start: "2026-01-01",
        period_end: "2026-06-30",
        due_date: "2026-08-15",
      })
      .select("id")
      .single();

    if (error || !cycle) throw new Error(error?.message ?? "Failed to seed review cycle");
    cycleId = cycle.id;
  }

  let appraisals = 0;
  for (const employee of employees.slice(0, 8)) {
    const { data: existingAppraisal } = await admin
      .from("performance_appraisals")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("employee_id", employee.id)
      .eq("review_cycle_id", cycleId)
      .maybeSingle();

    if (existingAppraisal) continue;

    const { error } = await admin.from("performance_appraisals").insert({
      organization_id: organizationId,
      employee_id: employee.id,
      review_cycle_id: cycleId,
      status: appraisals % 3 === 0 ? "pending" : "draft",
      self_rating: appraisals % 2 === 0 ? 4 : null,
      self_comments: appraisals % 2 === 0 ? "Met all quarterly goals." : null,
    });

    if (!error) appraisals += 1;
  }

  console.log(`Seeded review cycle and ${appraisals} appraisals`);
}

async function seedAuditEvents(admin: SupabaseClient, organizationId: string) {
  const events = [
    { action: "employee.updated", resource_type: "employee", resource_id: "demo" },
    { action: "payroll.payrun_created", resource_type: "payroll_payrun", resource_id: "demo" },
    { action: "document.uploaded", resource_type: "employee_document", resource_id: "demo" },
    { action: "auth.login", resource_type: "user", resource_id: "demo" },
  ];

  for (const event of events) {
    await admin.from("audit_events").insert({
      organization_id: organizationId,
      action: event.action,
      resource_type: event.resource_type,
      resource_id: event.resource_id,
      metadata: { demoSeed: DEMO_TAG },
    });
  }

  console.log(`Seeded ${events.length} audit events`);
}

async function seedBranchStatutory(admin: SupabaseClient, organizationId: string) {
  const { data: branches } = await admin
    .from("branches")
    .select("id, name, epf_employer_number")
    .eq("organization_id", organizationId);

  for (const [index, branch] of (branches ?? []).entries()) {
    if (branch.epf_employer_number) continue;
    await admin
      .from("branches")
      .update({
        epf_employer_number: `EPF${String(index + 1).padStart(6, "0")}`,
        socso_employer_code: `SOCSO${String(index + 1).padStart(5, "0")}`,
      })
      .eq("id", branch.id);
  }

  console.log("Updated branch statutory employer codes");
}

async function resetDemoApprovals(admin: SupabaseClient, organizationId: string) {
  const { data: requests } = await admin
    .from("approval_requests")
    .select("id, payload")
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  const demoIds = (requests ?? [])
    .filter((row) => (row.payload as { demoSeed?: string } | null)?.demoSeed === DEMO_TAG)
    .map((row) => row.id);

  if (demoIds.length === 0) return;

  await admin.from("approval_steps").delete().in("approval_request_id", demoIds);
  await admin.from("approval_requests").delete().in("id", demoIds);
  console.log(`Removed ${demoIds.length} previous demo approval requests`);
}

async function seedPhase6Enterprise(admin: SupabaseClient, organizationId: string) {
  const { count: webhookCount } = await admin
    .from("webhook_endpoints")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("name", "Demo SIEM");

  if ((webhookCount ?? 0) === 0) {
    await admin.from("webhook_endpoints").insert({
      organization_id: organizationId,
      name: "Demo SIEM",
      url: "https://example.com/webhooks/hrms-demo",
      secret: "demo-webhook-secret",
      events_filter: ["employee.*", "leave.*", "payroll.payrun_locked"],
      status: "inactive",
    });
    console.log("Seeded demo webhook endpoint");
  }

  const { data: existingReq } = await admin
    .from("job_requisitions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("title", "Software Engineer (Demo)")
    .maybeSingle();

  if (existingReq) return;

  const { data: requisition, error: reqError } = await admin
    .from("job_requisitions")
    .insert({
      organization_id: organizationId,
      title: "Software Engineer (Demo)",
      description: "Demo recruitment pipeline for Phase 6 enterprise module.",
      headcount: 1,
      status: "open",
    })
    .select("id")
    .single();

  if (reqError || !requisition) {
    console.warn("Skipping recruitment seed:", reqError?.message);
    return;
  }

  const candidates = [
    { full_name: "Aina Rahman", email: "aina.demo@example.com", phone: "+60123456789" },
    { full_name: "Hafiz Wong", email: "hafiz.demo@example.com", phone: "+60198765432" },
  ];

  for (const [index, candidate] of candidates.entries()) {
    const { data: row } = await admin
      .from("job_candidates")
      .insert({ organization_id: organizationId, ...candidate })
      .select("id")
      .single();
    if (!row) continue;

    const stage = index === 0 ? "offer" : "screening";
    const { data: application } = await admin
      .from("job_applications")
      .insert({
        organization_id: organizationId,
        requisition_id: requisition.id,
        candidate_id: row.id,
        stage,
        applied_at: new Date().toISOString(),
        stage_updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (index === 0 && application) {
      await admin.from("job_offers").insert({
        organization_id: organizationId,
        application_id: application.id,
        job_title: "Software Engineer",
        basic_salary: 6500,
        start_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: "draft",
      });
    }
  }

  console.log("Seeded demo recruitment pipeline");
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEFAULT_ORGANIZATION_ID");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (hasFlag("--reset")) {
    await resetDemoApprovals(admin, organizationId);
  }

  const { data: employees, error: employeesError } = await admin
    .from("employees")
    .select("id, full_name, employee_number, branch_id, manager_employee_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("employee_number");

  if (employeesError || !employees?.length) {
    throw new Error(employeesError?.message ?? "No active employees found");
  }

  const { data: leaveType } = await admin
    .from("leave_types")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Annual Leave")
    .maybeSingle();

  const { data: claimType } = await admin
    .from("claim_types")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", "Transport")
    .maybeSingle();

  if (!leaveType?.id || !claimType?.id) {
    console.error("Run pnpm seed-org-catalogs first");
    process.exit(1);
  }

  await seedBranchAssignments(admin, organizationId, employees);
  await seedReportingLines(admin, organizationId, employees);
  await seedSalaries(admin, organizationId, employees);
  await seedDocuments(admin, organizationId, employees);
  await seedAttendanceToday(admin, organizationId, employees);
  await seedPerformance(admin, organizationId, employees);
  await seedAuditEvents(admin, organizationId);
  await seedBranchStatutory(admin, organizationId);
  await seedPhase6Enterprise(admin, organizationId);

  const { count: pendingBefore } = await admin
    .from("approval_requests")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("status", "pending");

  if ((pendingBefore ?? 0) < 5) {
    const withManagers = employees.filter((employee) => employee.manager_employee_id);
    await seedApprovals(admin, organizationId, withManagers, leaveType.id, claimType.id);
  } else {
    console.log(`Skipping approvals — ${pendingBefore} pending requests already exist`);
  }

  console.log("Demo data seed complete for org", organizationId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
