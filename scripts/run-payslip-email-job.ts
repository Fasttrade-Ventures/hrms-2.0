#!/usr/bin/env tsx
/**
 * Daily payslip email job — queue notifications for locked payruns due today.
 *
 * Usage:
 *   set -a && source apps/web/.env.local && set +a
 *   pnpm payroll:payslip-email
 *   pnpm payroll:payslip-email --as-of 2026-07-31
 */
import { runPayslipEmailJob } from "../apps/web/src/lib/payroll/jobs/payslip-email";

function getArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index === process.argv.length - 1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const asOf = getArg("--as-of") ?? new Date().toISOString().slice(0, 10);
  const queued = await runPayslipEmailJob(asOf);
  console.log(`Queued ${queued} payslip email(s) for pay date ${asOf}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
