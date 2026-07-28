import type { ProductTier } from "@hrms/platform";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ProvisionTenantInput = {
  company: string;
  fullName: string;
  email: string;
  password: string;
  productTier?: ProductTier;
};

export type ProvisionTenantResult = {
  organizationId: string;
  slug: string;
};

export function slugifyOrganizationName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function provisionTenant(
  admin: SupabaseClient,
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  const company = input.company.trim();
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!company || !fullName || !email || !password) {
    throw new Error("All fields are required.");
  }

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const baseSlug = slugifyOrganizationName(company) || "org";
  let slug = baseSlug;
  let suffix = 1;

  while (suffix < 20) {
    const { data: existing } = await admin.from("organizations").select("id").eq("slug", slug).maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name: company,
      slug,
      product_tier: input.productTier ?? "core",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    throw new Error(orgError?.message ?? "Failed to create organization.");
  }

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .insert({ organization_id: org.id, name: "Head office" })
    .select("id")
    .single();

  if (branchError || !branch) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(branchError?.message ?? "Failed to create branch.");
  }

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(authError?.message ?? "Failed to create user.");
  }

  const { data: employee, error: employeeError } = await admin
    .from("employees")
    .insert({
      organization_id: org.id,
      employee_number: "OWNER-001",
      full_name: fullName,
      email,
      branch_id: branch.id,
      status: "active",
      join_date: new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(employeeError?.message ?? "Failed to create employee.");
  }

  const { error: membershipError } = await admin.from("organization_memberships").insert({
    organization_id: org.id,
    user_id: authUser.user.id,
    employee_id: employee.id,
    roles: ["organization_owner", "hr_administrator"],
    branch_id: branch.id,
  });

  if (membershipError) {
    await admin.from("employees").delete().eq("id", employee.id);
    await admin.auth.admin.deleteUser(authUser.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    throw new Error(membershipError.message);
  }

  await admin.from("employee_profiles").insert({
    employee_id: employee.id,
    organization_id: org.id,
  });

  return { organizationId: org.id, slug };
}
