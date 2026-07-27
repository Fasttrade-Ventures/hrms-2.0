/**
 * Create demo accounts for every portal role (standalone org).
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-role-accounts --password 'DemoPass123!'
 *
 * Options:
 *   --password <value>     Required. Same password for all seeded accounts.
 *   --domain <domain>      Email domain (default: demo.hrms.local)
 *   --include-platform     Also create platform_administrator (SaaS)
 *   --dry-run              Print planned actions only
 */
import { createClient } from "@supabase/supabase-js";

import { SYSTEM_ROLES, type SystemRole } from "../packages/domain/src/roles";

type SeedAccount = {
  role: SystemRole;
  label: string;
  employeeNumber: string;
};

const STANDALONE_ACCOUNTS: SeedAccount[] = [
  { role: "employee", label: "Employee Demo", employeeNumber: "DEMO-EMP" },
  { role: "manager", label: "Manager Demo", employeeNumber: "DEMO-MGR" },
  { role: "branch_admin", label: "Branch Admin Demo", employeeNumber: "DEMO-BRN" },
  { role: "hr_administrator", label: "HR Admin Demo", employeeNumber: "DEMO-HR" },
  { role: "director", label: "Director Demo", employeeNumber: "DEMO-DIR" },
  { role: "organization_owner", label: "Organization Owner Demo", employeeNumber: "DEMO-OWN" },
];

const PLATFORM_ACCOUNT: SeedAccount = {
  role: "platform_administrator",
  label: "Platform Admin Demo",
  employeeNumber: "DEMO-PLT",
};

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function emailForRole(role: SystemRole, domain: string): string {
  return `${role.replace(/_/g, "-")}@${domain}`;
}

function employeeNumberForAccount(account: SeedAccount, domain: string): string {
  if (domain === "demo.hrms.local") {
    return account.employeeNumber;
  }

  const slug = domain.split(".")[0]?.toUpperCase().slice(0, 6) ?? "ORG";
  return `${account.employeeNumber}-${slug}`;
}

async function seedAuditorAccount(
  admin: ReturnType<typeof createClient>,
  organizationId: string,
  domain: string,
  password: string,
  joinDate: string,
) {
  const email = `auditor@${domain}`;
  const label = "Auditor Demo";
  const employeeNumber = domain === "demo.hrms.local" ? "DEMO-AUD" : `DEMO-AUD-${domain.split(".")[0]?.toUpperCase().slice(0, 6) ?? "ORG"}`;

  const { data: authList } = await admin.auth.admin.listUsers();
  const existingAuthUser = authList.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  let userId = existingAuthUser?.id ?? null;
  if (!userId) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: label },
    });
    if (error || !created.user) {
      console.warn(`Auditor seed skipped: ${error?.message ?? "auth create failed"}`);
      return;
    }
    userId = created.user.id;
  } else {
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: label },
    });
  }

  const { data: existingEmployee } = await admin
    .from("employees")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("email", email)
    .maybeSingle();

  let employeeId = existingEmployee?.id ?? null;
  if (!employeeId) {
    const { data: employee, error } = await admin
      .from("employees")
      .insert({
        organization_id: organizationId,
        employee_number: employeeNumber,
        full_name: label,
        email,
        status: "active",
        join_date: joinDate,
      })
      .select("id")
      .single();
    if (error || !employee) {
      console.warn(`Auditor seed skipped: ${error?.message ?? "employee create failed"}`);
      return;
    }
    employeeId = employee.id;
    await admin.from("employee_profiles").insert({
      employee_id: employeeId,
      organization_id: organizationId,
    });
  }

  const { data: membership } = await admin
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membership) {
    await admin
      .from("organization_memberships")
      .update({ employee_id: employeeId, roles: ["employee"], permissions: ["auditor"] })
      .eq("id", membership.id);
  } else {
    await admin.from("organization_memberships").insert({
      organization_id: organizationId,
      user_id: userId,
      employee_id: employeeId,
      roles: ["employee"],
      permissions: ["auditor"],
    });
  }

  console.log(`\nAuditor account: ${email} (permissions: auditor)`);
}

async function main() {
  const password = getArg("--password");
  const domain = getArg("--domain") ?? "demo.hrms.local";
  const dryRun = hasFlag("--dry-run");
  const includePlatform = hasFlag("--include-platform");

  if (!password) {
    console.error(
      "Usage: pnpm seed-role-accounts --password 'DemoPass123!' [--domain demo.hrms.local] [--include-platform] [--dry-run]",
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    console.error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEFAULT_ORGANIZATION_ID",
    );
    process.exit(1);
  }

  const accounts = [...STANDALONE_ACCOUNTS, ...(includePlatform ? [PLATFORM_ACCOUNT] : [])];
  const expectedRoles = includePlatform
    ? SYSTEM_ROLES
    : SYSTEM_ROLES.filter((role) => role !== "platform_administrator");

  for (const role of expectedRoles) {
    if (!accounts.some((account) => account.role === role)) {
      console.warn(`No seed account configured for role: ${role}`);
    }
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .select("id, name")
    .eq("id", organizationId)
    .maybeSingle();

  if (orgError || !org) {
    console.error("Organization not found:", organizationId, orgError?.message);
    process.exit(1);
  }

  console.log(`Organization: ${org.name} (${org.id})`);
  console.log(`Domain: ${domain}`);
  if (dryRun) {
    console.log("DRY RUN — no changes will be made\n");
  }

  const joinDate = new Date().toISOString().slice(0, 10);
  const results: Array<{ role: string; email: string; status: string }> = [];

  for (const account of accounts) {
    const email = emailForRole(account.role, domain);

    if (dryRun) {
      results.push({ role: account.role, email, status: "planned" });
      continue;
    }

    const { data: existingEmployee } = await admin
      .from("employees")
      .select("id, email")
      .eq("organization_id", organizationId)
      .eq("email", email)
      .maybeSingle();

    let employeeId = existingEmployee?.id ?? null;
    let userId: string | null = null;

    const { data: authList } = await admin.auth.admin.listUsers();
    const existingAuthUser = authList.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      await admin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: { full_name: account.label },
      });
    } else {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: account.label },
      });

      if (createError || !created.user) {
        results.push({
          role: account.role,
          email,
          status: `failed auth: ${createError?.message ?? "unknown"}`,
        });
        continue;
      }

      userId = created.user.id;
    }

    if (!employeeId) {
      const employeeNumber = employeeNumberForAccount(account, domain);
      const { data: employee, error: employeeError } = await admin
        .from("employees")
        .insert({
          organization_id: organizationId,
          employee_number: employeeNumber,
          full_name: account.label,
          email,
          status: "active",
          join_date: joinDate,
        })
        .select("id")
        .single();

      if (employeeError || !employee) {
        if (!existingAuthUser && userId) {
          await admin.auth.admin.deleteUser(userId);
        }
        results.push({
          role: account.role,
          email,
          status: `failed employee: ${employeeError?.message ?? "unknown"}`,
        });
        continue;
      }

      employeeId = employee.id;

      await admin.from("employee_profiles").insert({
        employee_id: employeeId,
        organization_id: organizationId,
      });
    } else {
      await admin
        .from("employees")
        .update({ full_name: account.label, status: "active" })
        .eq("id", employeeId);
    }

    const { data: existingMembership } = await admin
      .from("organization_memberships")
      .select("id, roles")
      .eq("organization_id", organizationId)
      .eq("user_id", userId!)
      .maybeSingle();

    if (existingMembership) {
      const roles = new Set(existingMembership.roles ?? []);
      roles.add(account.role);

      await admin
        .from("organization_memberships")
        .update({
          employee_id: employeeId,
          roles: [...roles],
        })
        .eq("id", existingMembership.id);
    } else {
      const { error: membershipError } = await admin.from("organization_memberships").insert({
        organization_id: organizationId,
        user_id: userId!,
        employee_id: employeeId,
        roles: [account.role],
      });

      if (membershipError) {
        results.push({
          role: account.role,
          email,
          status: `failed membership: ${membershipError.message}`,
        });
        continue;
      }
    }

    results.push({ role: account.role, email, status: "ready" });
  }

  console.log("\nRole accounts:\n");
  console.log("| Role | Email | Status |");
  console.log("|------|-------|--------|");
  for (const row of results) {
    console.log(`| ${row.role} | ${row.email} | ${row.status} |`);
  }

  if (!dryRun) {
    await seedAuditorAccount(admin, organizationId, domain, password, joinDate);
  }

  if (!dryRun) {
    console.log(`\nPassword for all accounts: ${password}`);
    console.log("Sign in at /auth/login — each account lands on its role dashboard.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
