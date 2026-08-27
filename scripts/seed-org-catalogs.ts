/**
 * Seed default leave, claim, and payroll catalogs.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm seed-org-catalogs
 *
 * Uses DEFAULT_ORGANIZATION_ID, or ORGANIZATION_ID override for a single tenant.
 */
import { createClient } from "@supabase/supabase-js";

import { seedOrgCatalogs } from "../apps/web/src/lib/platform/seed-org-catalogs";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const organizationId = process.env.ORGANIZATION_ID ?? process.env.DEFAULT_ORGANIZATION_ID;

  if (!supabaseUrl || !serviceRoleKey || !organizationId) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DEFAULT_ORGANIZATION_ID (or ORGANIZATION_ID)",
    );
    process.exit(1);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const result = await seedOrgCatalogs(admin, organizationId);
  console.log("Catalogs seeded for org", organizationId, result);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
