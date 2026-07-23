/**
 * Seed default leave and claim types for DEFAULT_ORGANIZATION_ID.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-org-catalogs
 */
import { createClient } from "@supabase/supabase-js";

const LEAVE_TYPES = [
  { name: "Annual Leave", entitlement_days: 14, requires_attachment: false, is_unpaid: false },
  { name: "Medical Leave", entitlement_days: 14, requires_attachment: true, is_unpaid: false },
  { name: "Hospitalization Leave", entitlement_days: 60, requires_attachment: true, is_unpaid: false },
  { name: "Unpaid Leave", entitlement_days: 0, requires_attachment: false, is_unpaid: true },
];

const CLAIM_TYPES = [
  { name: "Medical", max_amount: 500 },
  { name: "Transport", max_amount: 200 },
  { name: "Meal", max_amount: 100 },
  { name: "Other", max_amount: null },
];

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

  for (const type of LEAVE_TYPES) {
    const { error } = await admin.from("leave_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );

    if (error && !error.message.includes("duplicate")) {
      console.error("leave_types:", error.message);
    }
  }

  for (const type of CLAIM_TYPES) {
    const { error } = await admin.from("claim_types").upsert(
      { organization_id: organizationId, ...type },
      { onConflict: "organization_id,name", ignoreDuplicates: true },
    );

    if (error && !error.message.includes("duplicate")) {
      console.error("claim_types:", error.message);
    }
  }

  console.log("Default leave and claim types seeded for org", organizationId);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
