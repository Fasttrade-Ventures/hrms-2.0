/**
 * Migration script to map existing free-text job_title strings to centralized positions catalog.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-positions.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Starting job_title -> positions migration...");

  // 1. Fetch all employees with job_title
  const { data: employees, error: fetchError } = await admin
    .from("employees")
    .select("id, organization_id, job_title, department_id, position_id")
    .not("job_title", "is", null);

  if (fetchError) {
    console.error("Failed to fetch employees:", fetchError.message);
    process.exit(1);
  }

  const validEmployees = (employees ?? []).filter(
    (e) => e.job_title && e.job_title.trim().length > 0,
  );

  console.log(`Found ${validEmployees.length} employees with non-empty job_title.`);

  let createdPositions = 0;
  let linkedEmployees = 0;

  // Group by organization
  const orgEmployees = new Map<string, typeof validEmployees>();
  for (const emp of validEmployees) {
    const list = orgEmployees.get(emp.organization_id) ?? [];
    list.push(emp);
    orgEmployees.set(emp.organization_id, list);
  }

  for (const [orgId, empList] of orgEmployees.entries()) {
    // Unique titles for this org
    const titleToDept = new Map<string, string | null>();
    for (const emp of empList) {
      const cleanTitle = emp.job_title!.trim();
      if (!titleToDept.has(cleanTitle) || emp.department_id) {
        titleToDept.set(cleanTitle, emp.department_id ?? null);
      }
    }

    for (const [title, deptId] of titleToDept.entries()) {
      // Upsert position
      const { data: pos, error: posError } = await admin
        .from("positions")
        .upsert(
          {
            organization_id: orgId,
            title,
            department_id: deptId,
            is_active: true,
          },
          { onConflict: "organization_id,title" },
        )
        .select("id")
        .single();

      if (posError) {
        console.error(`Error creating position "${title}" for org ${orgId}:`, posError.message);
        continue;
      }

      createdPositions += 1;
      const positionId = pos.id;

      // Link unlinked employees with this title
      const targetEmployees = empList.filter(
        (e) => e.job_title!.trim().toLowerCase() === title.toLowerCase() && !e.position_id,
      );

      for (const target of targetEmployees) {
        const { error: updateError } = await admin
          .from("employees")
          .update({ position_id: positionId })
          .eq("id", target.id);

        if (!updateError) {
          linkedEmployees += 1;
        } else {
          console.error(`Error linking employee ${target.id} to position:`, updateError.message);
        }
      }
    }
  }

  console.log(`\nMigration completed successfully!`);
  console.log(`- Positions processed / created: ${createdPositions}`);
  console.log(`- Employees linked to positions: ${linkedEmployees}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
