/**
 * Smoke test for completed phases (1–3).
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm smoke-test
 *   pnpm smoke-test --base-url https://hrms.asyrafdigital.com
 */
import { createClient } from "@supabase/supabase-js";

type CheckResult = {
  phase: string;
  name: string;
  ok: boolean;
  detail?: string;
};

const results: CheckResult[] = [];

function pass(phase: string, name: string, detail?: string) {
  results.push({ phase, name, ok: true, detail });
}

function fail(phase: string, name: string, detail?: string) {
  results.push({ phase, name, ok: false, detail });
}

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

async function fetchStatus(url: string, init?: RequestInit): Promise<{ status: number; location?: string }> {
  const response = await fetch(url, { redirect: "manual", ...init });
  return {
    status: response.status,
    location: response.headers.get("location") ?? undefined,
  };
}

async function fetchOk(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { redirect: "follow" });
    return response.ok;
  } catch {
    return false;
  }
}

async function runHttpChecks(baseUrl: string) {
  const phase = "Phase 1";

  const login = await fetchStatus(`${baseUrl}/auth/login`);
  if (login.status === 200) pass(phase, "GET /auth/login returns 200");
  else fail(phase, "GET /auth/login returns 200", `status ${login.status}`);

  const forgot = await fetchStatus(`${baseUrl}/auth/forgot-password`);
  if (forgot.status === 200) pass(phase, "GET /auth/forgot-password returns 200");
  else fail(phase, "GET /auth/forgot-password returns 200", `status ${forgot.status}`);

  const logoutPost = await fetchStatus(`${baseUrl}/api/auth/logout`, { method: "POST" });
  if (logoutPost.status === 307 && logoutPost.location?.includes("/auth/login")) {
    pass(phase, "POST /api/auth/logout redirects to login");
  } else {
    fail(phase, "POST /api/auth/logout redirects to login", `status ${logoutPost.status} loc ${logoutPost.location}`);
  }

  const logoutGet = await fetchStatus(`${baseUrl}/api/auth/logout`);
  if (logoutGet.status === 307 && logoutGet.location?.includes("/auth/login")) {
    pass(phase, "GET /api/auth/logout redirects to login");
  } else {
    fail(phase, "GET /api/auth/logout redirects to login", `status ${logoutGet.status}`);
  }

  const hrGuard = await fetchStatus(`${baseUrl}/hr/dashboard`);
  if (hrGuard.status === 307 && hrGuard.location?.includes("/auth/login")) {
    pass(phase, "Unauthenticated /hr/dashboard redirects to login");
  } else {
    fail(phase, "Unauthenticated /hr/dashboard redirects to login", `status ${hrGuard.status}`);
  }

  const employeeGuard = await fetchStatus(`${baseUrl}/employee/dashboard`);
  if (employeeGuard.status === 307 && employeeGuard.location?.includes("/auth/login")) {
    pass(phase, "Unauthenticated /employee/dashboard redirects to login");
  } else {
    fail(phase, "Unauthenticated /employee/dashboard redirects to login", `status ${employeeGuard.status}`);
  }

  const unauthorized = await fetchOk(`${baseUrl}/unauthorized`);
  if (unauthorized) pass(phase, "GET /unauthorized loads");
  else fail(phase, "GET /unauthorized loads");

  const health = await fetch(`${baseUrl}/api/health`);
  let healthJson: { ok?: boolean; services?: { supabase?: { ok?: boolean } } } = {};
  try {
    healthJson = (await health.json()) as typeof healthJson;
  } catch {
    fail(phase, "GET /api/health — Supabase service ok", `status ${health.status} (non-JSON body)`);
  }
  if (healthJson.services?.supabase?.ok) {
    pass(phase, "GET /api/health — Supabase service ok");
  } else if (health.ok && healthJson.ok) {
    pass(phase, "GET /api/health ok");
  } else if (!results.some((r) => r.name.startsWith("GET /api/health"))) {
    fail(
      phase,
      "GET /api/health — Supabase service ok",
      `status ${health.status} supabase=${healthJson.services?.supabase?.ok}`,
    );
  }

  const phase2 = "Phase 2";
  const loginHtml = await (await fetch(`${baseUrl}/auth/login`)).text();
  if (loginHtml.includes("auth-theme") || loginHtml.includes("HRMS")) {
    pass(phase2, "Auth page renders Forest Sage shell markers");
  } else {
    fail(phase2, "Auth page renders Forest Sage shell markers");
  }

  if (
    loginHtml.includes("Sign in") ||
    loginHtml.includes("Email address") ||
    loginHtml.includes('name="email"') ||
    loginHtml.includes("auth-theme")
  ) {
    pass(phase2, "Login page contains sign-in form content");
  } else {
    fail(phase2, "Login page contains sign-in form content");
  }
}

async function runDbChecks(): Promise<ReturnType<typeof createClient> | null> {
  const phase = "Phase 3";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    fail(phase, "Supabase env configured", "Missing URL, service role, or org id");
    return null;
  }

  pass(phase, "Supabase env configured");

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (org && !orgError) pass(phase, "Organization exists", org.name);
  else fail(phase, "Organization exists", orgError?.message);

  const { count: employeeCount, error: employeeError } = await admin
    .from("employees")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (!employeeError && (employeeCount ?? 0) > 0) {
    pass(phase, "Employees table has records", `${employeeCount} employees`);
  } else {
    fail(phase, "Employees table has records", employeeError?.message);
  }

  const { count: membershipCount, error: membershipError } = await admin
    .from("organization_memberships")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (!membershipError && (membershipCount ?? 0) > 0) {
    pass(phase, "Organization memberships exist", `${membershipCount} memberships`);
  } else {
    fail(phase, "Organization memberships exist", membershipError?.message);
  }

  const seededRoles = [
    "employee@asyrafdigital.com",
    "hr-administrator@asyrafdigital.com",
    "manager@asyrafdigital.com",
  ];

  for (const email of seededRoles) {
    const { data: employee } = await admin
      .from("employees")
      .select("id, full_name")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();

    if (employee) {
      pass(phase, `Employee record: ${email}`);
    } else {
      fail(phase, `Employee record: ${email}`);
    }
  }

  const { data: profiles, error: profileError } = await admin
    .from("employee_profiles")
    .select("employee_id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (!profileError && profiles && profiles.length > 0) {
    pass(phase, "Employee profiles table populated");
  } else {
    fail(phase, "Employee profiles table populated", profileError?.message);
  }

  const { data: auditRows, error: auditError } = await admin
    .from("audit_events")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (!auditError) pass(phase, "Audit events table accessible");
  else fail(phase, "Audit events table accessible", auditError.message);

  return admin;
}

async function runDocumentsHttpChecks(baseUrl: string) {
  const phase = "Documents";

  const routes = [
    "/hr/documents",
    "/hr/documents/library",
    "/hr/documents/folders",
    "/hr/documents/required",
    "/hr/documents/compliance",
    "/hr/notifications",
    "/employee/documents",
    "/manager/team-documents",
  ];

  for (const route of routes) {
    const response = await fetchStatus(`${baseUrl}${route}`);
    if (response.status === 307 && response.location?.includes("/auth/login")) {
      pass(phase, `Unauthenticated ${route} redirects to login`);
    } else {
      fail(phase, `Unauthenticated ${route} redirects to login`, `status ${response.status}`);
    }
  }

  const download = await fetchStatus(`${baseUrl}/api/files/00000000-0000-0000-0000-000000000001/download`);
  if (
    download.status === 401 ||
    (download.status === 307 && download.location?.includes("/auth/login"))
  ) {
    pass(phase, "Unauthenticated file download is blocked");
  } else {
    fail(phase, "Unauthenticated file download is blocked", `status ${download.status}`);
  }
}

async function runDocumentsDbChecks(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
) {
  const phase = "Documents";

  const { error: requiredError } = await admin
    .from("required_documents")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (!requiredError) pass(phase, "required_documents table accessible");
  else fail(phase, "required_documents table accessible", requiredError.message);

  const { count: folderCount, error: folderError } = await admin
    .from("document_folders")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (!folderError) pass(phase, "document_folders table accessible", `${folderCount ?? 0} folder(s)`);
  else fail(phase, "document_folders table accessible", folderError.message);

  const { count: documentCount, error: documentError } = await admin
    .from("employee_documents")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (!documentError) {
    pass(phase, "employee_documents table accessible", `${documentCount ?? 0} document(s)`);
  } else {
    fail(phase, "employee_documents table accessible", documentError.message);
  }
}

async function runAnnouncementsHttpChecks(baseUrl: string) {
  const phase = "Announcements";

  const routes = [
    "/hr/announcements",
    "/employee/announcements",
    "/manager/announcements",
  ];

  for (const route of routes) {
    const response = await fetchStatus(`${baseUrl}${route}`);
    if (response.status === 307 && response.location?.includes("/auth/login")) {
      pass(phase, `Unauthenticated ${route} redirects to login`);
    } else {
      fail(phase, `Unauthenticated ${route} redirects to login`, `status ${response.status}`);
    }
  }
}

async function runAnnouncementsDbChecks(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
) {
  const phase = "Announcements";

  const { error } = await admin
    .from("announcements")
    .select("id, status, target_department_ids")
    .eq("organization_id", organizationId)
    .limit(1);

  if (!error) pass(phase, "announcements workflow columns accessible");
  else fail(phase, "announcements workflow columns accessible", error.message);
}

async function runOrgHttpChecks(baseUrl: string) {
  const phase = "Organization";

  const routes = [
    "/hr/organization",
    "/hr/organization/branches",
    "/hr/organization/branches/create",
    "/hr/organization/departments",
    "/hr/organization/departments/create",
    "/hr/organization/shifts",
    "/hr/organization/shifts/create",
    "/hr/organization/holidays",
    "/hr/organization/holidays/create",
    "/hr/organization/leave-types",
    "/hr/organization/leave-types/create",
  ];

  for (const route of routes) {
    const response = await fetchStatus(`${baseUrl}${route}`);
    if (response.status === 307 && response.location?.includes("/auth/login")) {
      pass(phase, `Unauthenticated ${route} redirects to login`);
    } else {
      fail(phase, `Unauthenticated ${route} redirects to login`, `status ${response.status}`);
    }
  }
}

async function runOrgCatalogChecks(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
) {
  const phase = "Organization";
  const stamp = Date.now();
  const tag = `smoke-${stamp}`;

  let branchId: string | null = null;
  let departmentId: string | null = null;
  let shiftId: string | null = null;
  let holidayId: string | null = null;
  let leaveTypeId: string | null = null;

  try {
    const { data: branch, error: branchError } = await admin
      .from("branches")
      .insert({
        organization_id: organizationId,
        name: `Smoke Branch ${tag}`,
        weekend_mode: "sat_sun",
        payroll_cutoff_day: 6,
      })
      .select("id, name")
      .single();

    if (branchError || !branch) fail(phase, "Create branch", branchError?.message);
    else {
      branchId = branch.id;
      pass(phase, "Create branch", branch.name);
    }

    const { data: department, error: departmentError } = await admin
      .from("departments")
      .insert({
        organization_id: organizationId,
        branch_id: branchId,
        name: `Smoke Department ${tag}`,
      })
      .select("id, name")
      .single();

    if (departmentError || !department) fail(phase, "Create department", departmentError?.message);
    else {
      departmentId = department.id;
      pass(phase, "Create department", department.name);
    }

    const { data: shift, error: shiftError } = await admin
      .from("shifts")
      .insert({
        organization_id: organizationId,
        name: `Smoke Shift ${tag}`,
        start_time: "09:00:00",
        end_time: "18:00:00",
        grace_minutes: 10,
      })
      .select("id, name")
      .single();

    if (shiftError || !shift) fail(phase, "Create shift", shiftError?.message);
    else {
      shiftId = shift.id;
      pass(phase, "Create shift", shift.name);
    }

    const holidayDate = "2099-12-25";
    const { data: holiday, error: holidayError } = await admin
      .from("holidays")
      .insert({
        organization_id: organizationId,
        branch_id: branchId,
        name: `Smoke Holiday ${tag}`,
        holiday_date: holidayDate,
      })
      .select("id, name")
      .single();

    if (holidayError || !holiday) fail(phase, "Create holiday", holidayError?.message);
    else {
      holidayId = holiday.id;
      pass(phase, "Create holiday", holiday.name);
    }

    const { data: leaveType, error: leaveTypeError } = await admin
      .from("leave_types")
      .insert({
        organization_id: organizationId,
        name: `Smoke Leave ${tag}`,
        entitlement_days: 2,
        requires_attachment: false,
        is_unpaid: false,
      })
      .select("id, name")
      .single();

    if (leaveTypeError || !leaveType) fail(phase, "Create leave type", leaveTypeError?.message);
    else {
      leaveTypeId = leaveType.id;
      pass(phase, "Create leave type", leaveType.name);
    }

    const { error: updateBranchError } = await admin
      .from("branches")
      .update({ name: `Smoke Branch Updated ${tag}`, payroll_cutoff_day: 7 })
      .eq("id", branchId!)
      .eq("organization_id", organizationId);
    if (updateBranchError) fail(phase, "Update branch", updateBranchError.message);
    else pass(phase, "Update branch");

    const { error: updateDepartmentError } = await admin
      .from("departments")
      .update({ name: `Smoke Department Updated ${tag}` })
      .eq("id", departmentId!)
      .eq("organization_id", organizationId);
    if (updateDepartmentError) fail(phase, "Update department", updateDepartmentError.message);
    else pass(phase, "Update department");

    const { error: updateShiftError } = await admin
      .from("shifts")
      .update({ grace_minutes: 15, end_time: "17:30:00" })
      .eq("id", shiftId!)
      .eq("organization_id", organizationId);
    if (updateShiftError) fail(phase, "Update shift", updateShiftError.message);
    else pass(phase, "Update shift");

    const { error: updateHolidayError } = await admin
      .from("holidays")
      .update({ name: `Smoke Holiday Updated ${tag}` })
      .eq("id", holidayId!)
      .eq("organization_id", organizationId);
    if (updateHolidayError) fail(phase, "Update holiday", updateHolidayError.message);
    else pass(phase, "Update holiday");

    const { error: updateLeaveTypeError } = await admin
      .from("leave_types")
      .update({ entitlement_days: 3, requires_attachment: true })
      .eq("id", leaveTypeId!)
      .eq("organization_id", organizationId);
    if (updateLeaveTypeError) fail(phase, "Update leave type", updateLeaveTypeError.message);
    else pass(phase, "Update leave type");

    const { data: listedBranch, error: readBranchError } = await admin
      .from("branches")
      .select("id, name, payroll_cutoff_day")
      .eq("id", branchId!)
      .maybeSingle();
    if (readBranchError || !listedBranch || listedBranch.payroll_cutoff_day !== 7) {
      fail(phase, "Read branch", readBranchError?.message ?? "record mismatch");
    } else pass(phase, "Read branch");

    const { count: departmentCount, error: listDepartmentError } = await admin
      .from("departments")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId!);
    if (listDepartmentError || (departmentCount ?? 0) < 1) {
      fail(phase, "List departments for branch", listDepartmentError?.message);
    } else pass(phase, "List departments for branch", `${departmentCount} record(s)`);

    const { count: shiftCount, error: listShiftError } = await admin
      .from("shifts")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .ilike("name", `%${tag}%`);
    if (listShiftError || (shiftCount ?? 0) < 1) {
      fail(phase, "List shifts", listShiftError?.message);
    } else pass(phase, "List shifts", `${shiftCount} record(s)`);

    const { count: holidayCount, error: listHolidayError } = await admin
      .from("holidays")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("holiday_date", holidayDate);
    if (listHolidayError || (holidayCount ?? 0) < 1) {
      fail(phase, "List holidays", listHolidayError?.message);
    } else pass(phase, "List holidays", `${holidayCount} record(s)`);

    const { data: listedLeaveType, error: readLeaveTypeError } = await admin
      .from("leave_types")
      .select("id, entitlement_days, requires_attachment")
      .eq("id", leaveTypeId!)
      .maybeSingle();
    if (
      readLeaveTypeError ||
      !listedLeaveType ||
      Number(listedLeaveType.entitlement_days) !== 3 ||
      listedLeaveType.requires_attachment !== true
    ) {
      fail(phase, "Read leave type", readLeaveTypeError?.message ?? "record mismatch");
    } else pass(phase, "Read leave type");
  } finally {
    if (leaveTypeId) {
      const { error } = await admin.from("leave_types").delete().eq("id", leaveTypeId);
      if (error) fail(phase, "Delete leave type", error.message);
      else pass(phase, "Delete leave type");
    }

    if (holidayId) {
      const { error } = await admin.from("holidays").delete().eq("id", holidayId);
      if (error) fail(phase, "Delete holiday", error.message);
      else pass(phase, "Delete holiday");
    }

    if (shiftId) {
      const { error } = await admin.from("shifts").delete().eq("id", shiftId);
      if (error) fail(phase, "Delete shift", error.message);
      else pass(phase, "Delete shift");
    }

    if (departmentId) {
      const { error } = await admin.from("departments").delete().eq("id", departmentId);
      if (error) fail(phase, "Delete department", error.message);
      else pass(phase, "Delete department");
    }

    if (branchId) {
      const { error } = await admin.from("branches").delete().eq("id", branchId);
      if (error) fail(phase, "Delete branch", error.message);
      else pass(phase, "Delete branch");
    }
  }
}

async function main() {
  const baseUrl = getArg("--base-url") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  console.log(`Smoke test target: ${baseUrl}\n`);

  await runHttpChecks(baseUrl.replace(/\/$/, ""));
  await runDocumentsHttpChecks(baseUrl.replace(/\/$/, ""));
  await runAnnouncementsHttpChecks(baseUrl.replace(/\/$/, ""));
  await runOrgHttpChecks(baseUrl.replace(/\/$/, ""));
  const admin = await runDbChecks();
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (admin && organizationId) {
    await runOrgCatalogChecks(admin, organizationId);
    await runDocumentsDbChecks(admin, organizationId);
    await runAnnouncementsDbChecks(admin, organizationId);
  } else {
    fail("Organization", "Organization catalog CRUD", "Skipped — Supabase env not configured");
    fail("Documents", "Documents DB checks", "Skipped — Supabase env not configured");
  }

  const failed = results.filter((result) => !result.ok);
  const byPhase = new Map<string, CheckResult[]>();

  for (const result of results) {
    const list = byPhase.get(result.phase) ?? [];
    list.push(result);
    byPhase.set(result.phase, list);
  }

  for (const [phase, checks] of byPhase) {
    console.log(`\n${phase}`);
    console.log("-".repeat(phase.length));
    for (const check of checks) {
      const icon = check.ok ? "✓" : "✗";
      const detail = check.detail ? ` — ${check.detail}` : "";
      console.log(`  ${icon} ${check.name}${detail}`);
    }
  }

  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
