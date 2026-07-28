import { createAdminClient } from "@/lib/supabase/admin";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function createPayoutBatchForPayrun(payrunId: string, bankFormat = "bank_csv"): Promise<string> {
  const organizationId = getOrganizationId();
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("payrun_payout_batches")
    .select("id")
    .eq("payrun_id", payrunId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: payrun } = await admin
    .from("payroll_payruns")
    .select("period_label")
    .eq("id", payrunId)
    .maybeSingle();

  const { data: batch, error: batchError } = await admin
    .from("payrun_payout_batches")
    .insert({
      organization_id: organizationId,
      payrun_id: payrunId,
      bank_format: bankFormat,
      status: "pending",
    })
    .select("id")
    .single();

  if (batchError || !batch) throw new Error(batchError?.message ?? "Failed to create payout batch.");

  const { data: items, error: itemsError } = await admin
    .from("payroll_payrun_items")
    .select("id, employee_id, net_pay, employees(employee_number)")
    .eq("payrun_id", payrunId);

  if (itemsError) throw new Error(itemsError.message);

  const periodLabel = payrun?.period_label ?? "period";
  const rows = (items ?? []).map((item) => {
    const employee = Array.isArray(item.employees) ? item.employees[0] : item.employees;
    const employeeNumber = (employee as { employee_number?: string } | null)?.employee_number ?? "EMP";
    return {
      organization_id: organizationId,
      batch_id: batch.id,
      payrun_item_id: item.id,
      employee_id: item.employee_id,
      reference: `PAY-${periodLabel}-${employeeNumber}`,
      amount: Number(item.net_pay ?? 0),
      status: "pending",
    };
  });

  if (rows.length > 0) {
    const { error } = await admin.from("payrun_payout_items").insert(rows);
    if (error) throw new Error(error.message);
  }

  return batch.id;
}

export async function getPayoutBatchForPayrun(payrunId: string) {
  const admin = createAdminClient();
  const { data: batch } = await admin
    .from("payrun_payout_batches")
    .select("id, status, bank_format, submitted_at, reconciled_at")
    .eq("payrun_id", payrunId)
    .maybeSingle();

  if (!batch) return null;

  const { data: items } = await admin
    .from("payrun_payout_items")
    .select("id, reference, amount, status, failure_reason, paid_at, employees(full_name, employee_number)")
    .eq("batch_id", batch.id)
    .order("reference");

  return { batch, items: items ?? [] };
}
