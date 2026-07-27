export type ClaimLine = { taxable: number; reimb: number };

export function aggregateClaimsByEmployee(
  rows: Array<{ employee_id: string; amount: number; claim_types: { payroll_treatment?: string } | Array<{ payroll_treatment?: string }> | null }>,
): Map<string, ClaimLine> {
  const claimsByEmployee = new Map<string, ClaimLine>();
  for (const row of rows) {
    const treatment = Array.isArray(row.claim_types) ? row.claim_types[0] : row.claim_types;
    const bucket = claimsByEmployee.get(row.employee_id) ?? { taxable: 0, reimb: 0 };
    const amount = Number(row.amount);
    if (treatment?.payroll_treatment === "reimbursement") bucket.reimb += amount;
    else if (treatment?.payroll_treatment !== "exclude") bucket.taxable += amount;
    claimsByEmployee.set(row.employee_id, bucket);
  }
  return claimsByEmployee;
}

export async function fetchApprovedClaimsForPeriod(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  organizationId: string,
  periodStart: string,
  periodEnd: string,
  employeeIds: string[],
) {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("claims")
    .select("employee_id, amount, claim_types(payroll_treatment)")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .gte("receipt_date", periodStart)
    .lte("receipt_date", periodEnd)
    .in("employee_id", employeeIds);
  if (error) throw new Error(error.message);
  return data ?? [];
}
