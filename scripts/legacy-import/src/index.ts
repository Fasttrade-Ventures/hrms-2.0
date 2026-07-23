#!/usr/bin/env tsx
/**
 * Legacy MySQL → PostgreSQL + uploads → R2 migration CLI.
 * Phase 0/10 — dry-run reconciliation scaffold.
 */

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

export async function runImport(options: ImportOptions): Promise<ReconciliationReport[]> {
  const reports: ReconciliationReport[] = [];

  for (const domain of options.domains) {
    reports.push({
      domain,
      legacyCount: 0,
      importedCount: 0,
      skippedCount: 0,
      errors: options.dryRun ? [] : [`${domain}: importer not yet wired — dry-run scaffold only`],
      passed: options.dryRun,
    });
  }

  return reports;
}

export function printReconciliationReport(reports: ReconciliationReport[]): void {
  console.log("\n=== Migration reconciliation ===\n");
  for (const r of reports) {
    const status = r.passed ? "PASS" : "FAIL";
    console.log(`[${status}] ${r.domain}: legacy=${r.legacyCount} imported=${r.importedCount} skipped=${r.skippedCount}`);
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
