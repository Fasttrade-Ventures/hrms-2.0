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
  const healthJson = (await health.json()) as {
    ok?: boolean;
    services?: { supabase?: { ok?: boolean } };
  };
  if (healthJson.services?.supabase?.ok) {
    pass(phase, "GET /api/health — Supabase service ok");
  } else if (health.ok && healthJson.ok) {
    pass(phase, "GET /api/health ok");
  } else {
    fail(phase, "GET /api/health — Supabase service ok", `status ${health.status} supabase=${healthJson.services?.supabase?.ok}`);
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

async function runDbChecks() {
  const phase = "Phase 3";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    fail(phase, "Supabase env configured", "Missing URL, service role, or org id");
    return;
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
}

async function main() {
  const baseUrl = getArg("--base-url") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  console.log(`Smoke test target: ${baseUrl}\n`);

  await runHttpChecks(baseUrl.replace(/\/$/, ""));
  await runDbChecks();

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
