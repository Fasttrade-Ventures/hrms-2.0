import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSaasMode } from "@hrms/platform";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function POST(request: Request) {
  if (!isSaasMode()) {
    return NextResponse.json({ error: "Registration is disabled in standalone mode." }, { status: 403 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const body = (await request.json()) as {
    company?: string;
    fullName?: string;
    email?: string;
    password?: string;
  };

  const company = body.company?.trim();
  const fullName = body.fullName?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!company || !fullName || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const baseSlug = slugify(company) || "org";
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
      product_tier: "core",
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Failed to create organization." }, { status: 500 });
  }

  const { data: branch, error: branchError } = await admin
    .from("branches")
    .insert({ organization_id: org.id, name: "Head office" })
    .select("id")
    .single();

  if (branchError || !branch) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: branchError?.message ?? "Failed to create branch." }, { status: 500 });
  }

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: authError?.message ?? "Failed to create user." }, { status: 500 });
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
    return NextResponse.json({ error: employeeError?.message ?? "Failed to create employee." }, { status: 500 });
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
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  await admin.from("employee_profiles").insert({
    employee_id: employee.id,
    organization_id: org.id,
  });

  return NextResponse.json({ organizationId: org.id, slug });
}
