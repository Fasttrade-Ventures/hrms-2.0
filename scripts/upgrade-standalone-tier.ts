/**
 * Upgrade the standalone organization to Enterprise tier (all modules).
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm upgrade-standalone-tier
 */
import { createClient } from "@supabase/supabase-js";

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

  const { data, error } = await admin
    .from("organizations")
    .update({ product_tier: "enterprise", updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("id, name, product_tier")
    .single();

  if (error || !data) {
    console.error("Failed to upgrade organization:", error?.message);
    process.exit(1);
  }

  console.log(`Upgraded ${data.name} (${data.id}) to ${data.product_tier}.`);
  console.log("Also set PRODUCT_TIER=enterprise in your Vercel project environment variables.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
