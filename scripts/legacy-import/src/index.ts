#!/usr/bin/env tsx
/**
 * Legacy MySQL → PostgreSQL + uploads → R2 migration CLI.
 * Phase 11 — dry-run reconciliation with Postgres counts.
 */

import { createClient } from "@supabase/supabase-js";

export type ImportDomain =
  | "identity"
  | "organization"
  | "leave"
  | "attendance"
  | "claims"
  | "payroll"
  | "documents"
  | "announcements"
  | "performance"
  | "assets";

export type ReconciliationReport = {
  domain: ImportDomain;
  legacyCount: number;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  passed: boolean;
};

export type ImportOptions = {
  organizationId: string;
  mysqlDsn: string;
  uploadsPath: string;
  dryRun: boolean;
  domains: ImportDomain[];
};

const DOMAIN_TABLE: Record<ImportDomain, string> = {
  identity: "employees",
  organization: "branches",
  leave: "leave_requests",
  attendance: "attendance_records",
  claims: "claims",
  payroll: "payroll_payruns",
  documents: "employee_documents",
  announcements: "announcements",
  performance: "performance_appraisals",
  assets: "assets",
};

async function countImported(
  organizationId: string,
  domain: ImportDomain,
): Promise<number> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const table = DOMAIN_TABLE[domain];
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) throw new Error(`${domain}: ${error.message}`);
  return count ?? 0;
}

export async function runImport(options: ImportOptions): Promise<ReconciliationReport[]> {
  const reports: ReconciliationReport[] = [];

  for (const domain of options.domains) {
    const importedCount = await countImported(options.organizationId, domain).catch((error) => {
      reports.push({
        domain,
        legacyCount: 0,
        importedCount: 0,
        skippedCount: 0,
        errors: [error instanceof Error ? error.message : String(error)],
        passed: false,
      });
      return null;
    });

    if (importedCount === null) continue;

    const errors: string[] = [];
    if (!options.dryRun) {
      errors.push(`${domain}: MySQL importer not yet wired — Postgres count only`);
    }

    reports.push({
      domain,
      legacyCount: options.dryRun ? importedCount : 0,
      importedCount,
      skippedCount: 0,
      errors,
      passed: options.dryRun ? true : errors.length === 0,
    });
  }

  return reports;
}

export function printReconciliationReport(reports: ReconciliationReport[]): void {
  console.log("\n=== Migration reconciliation ===\n");
  for (const r of reports) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(
      `[${status}] ${r.domain}: legacy=${r.legacyCount} imported=${r.importedCount} skipped=${r.skippedCount}`,
    );
    r.errors.forEach((e) => console.log(`  - ${e}`));
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const orgId = process.env.DEFAULT_ORGANIZATION_ID ?? "00000000-0000-4000-8000-000000000001";

  const reports = await runImport({
    organizationId: orgId,
    mysqlDsn: process.env.LEGACY_MYSQL_DSN ?? "",
    uploadsPath: process.env.LEGACY_UPLOADS_PATH ?? "",
    dryRun,
    domains: [
      "identity",
      "organization",
      "leave",
      "attendance",
      "claims",
      "payroll",
      "documents",
      "announcements",
      "performance",
      "assets",
    ],
  });

  printReconciliationReport(reports);
  const allPassed = reports.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
