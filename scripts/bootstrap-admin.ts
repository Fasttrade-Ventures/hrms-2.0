/**
 * Bootstrap the first HR administrator for standalone deployments.
 *
 * Usage:
 *   pnpm bootstrap-admin --email admin@example.com --password 'SecurePass123!' --name "HR Admin"
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and DEFAULT_ORGANIZATION_ID.
 */
import { createClient } from "@supabase/supabase-js";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = getArg("--email");
  const password = getArg("--password");
  const fullName = getArg("--name") ?? "HR Administrator";

  if (!email || !password) {
    console.error("Usage: pnpm bootstrap-admin --email <email> --password <password> [--name \"Full Name\"]");
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

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    console.error("Failed to create auth user:", createError?.message);
    process.exit(1);
  }

  const userId = created.user.id;

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      organization_id: organizationId,
      employee_number: "ADMIN-001",
      full_name: fullName,
      email,
      status: "active",
      join_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    console.error("Failed to create employee record:", employeeError?.message);
    await admin.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  const { error: membershipError } = await admin.from("organization_memberships").insert({
    organization_id: organizationId,
    user_id: userId,
    employee_id: employee.id,
    roles: ["hr_administrator", "organization_owner"],
  });

  if (membershipError) {
    console.error("Failed to create membership:", membershipError.message);
    await admin.from("employees").delete().eq("id", employee.id);
    await admin.auth.admin.deleteUser(userId);
    process.exit(1);
  }

  console.log("Bootstrap complete.");
  console.log(`  Organization: ${org.name} (${org.id})`);
  console.log(`  User: ${email} (${userId})`);
  console.log(`  Employee: ${employee.id}`);
  console.log(`  Roles: hr_administrator, organization_owner`);
  console.log("Sign in at /auth/login");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
