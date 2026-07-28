import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";

export async function requireBukucloudIntegrationAccess(): Promise<void> {
  await requireModule("integrations");
  await requireModule("payroll");
  await requireRole("hr_administrator");
}
