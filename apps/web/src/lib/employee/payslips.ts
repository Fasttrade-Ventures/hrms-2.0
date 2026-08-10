import { requireEmployeeContext } from "@/lib/employee/leave";
import { createClient } from "@/lib/supabase/server";

export type PayslipRow = {
  id: string;
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  grossPay: number;
  netPay: number;
  status: string;
  lockedAt: string | null;
};

export type PayslipDetail = PayslipRow & {
  epfEmployee: number;
  epfEmployer: number;
  socsoEmployee: number;
  socsoEmployer: number;
  eisEmployee: number;
  eisEmployer: number;
  pcb: number;
  components: {
    earnings: Array<{ code: string; name: string; amount: number }>;
    deductions: Array<{ code: string; name: string; amount: number }>;
    employer: Array<{ code: string; name: string; amount: number }>;
  };
};

function periodLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });
}

export async function listPayslips(): Promise<PayslipRow[]> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll_payrun_items")
    .select(
      "id, gross_pay, net_pay, payroll_payruns!inner(period_year, period_month, status, locked_at)",
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("payroll_payruns.status", "locked")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const payrun = row.payroll_payruns as {
        period_year?: number;
        period_month?: number;
        status?: string;
        locked_at?: string | null;
      } | null;

      if (!payrun || payrun.status !== "locked") {
        return null;
      }

      return {
        id: row.id,
        periodYear: payrun.period_year ?? 0,
        periodMonth: payrun.period_month ?? 0,
        periodLabel: periodLabel(payrun.period_year ?? 0, payrun.period_month ?? 0),
        grossPay: Number(row.gross_pay),
        netPay: Number(row.net_pay),
        status: payrun.status,
        lockedAt: payrun.locked_at ?? null,
      };
    })
    .filter((row): row is PayslipRow => row !== null);
}

export async function getPayslip(itemId: string): Promise<PayslipDetail | null> {
  const { employeeId, organizationId } = await requireEmployeeContext();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payroll_payrun_items")
    .select(
      `
      id,
      gross_pay,
      net_pay,
      epf_employee,
      epf_employer,
      socso_employee,
      socso_employer,
      eis_employee,
      eis_employer,
      pcb,
      payroll_payruns!inner(period_year, period_month, status, locked_at)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .eq("id", itemId)
    .eq("payroll_payruns.status", "locked")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const payrun = data.payroll_payruns as {
    period_year?: number;
    period_month?: number;
    status?: string;
    locked_at?: string | null;
  } | null;

  if (!payrun || payrun.status !== "locked") {
    return null;
  }

  const { data: componentRows, error: componentsError } = await supabase
    .from("payroll_item_components")
    .select("amount, payroll_components(code, name, component_type)")
    .eq("payrun_item_id", itemId)
    .eq("organization_id", organizationId)
    .order("created_at");

  if (componentsError) throw new Error(componentsError.message);

  const components = (componentRows ?? []).flatMap((row) => {
    const component = Array.isArray(row.payroll_components)
      ? row.payroll_components[0]
      : row.payroll_components;
    if (!component) return [];
    return [
      {
        code: component.code,
        name: component.name,
        componentType: component.component_type as string,
        amount: Number(row.amount),
      },
    ];
  });

  return {
    id: data.id,
    periodYear: payrun.period_year ?? 0,
    periodMonth: payrun.period_month ?? 0,
    periodLabel: periodLabel(payrun.period_year ?? 0, payrun.period_month ?? 0),
    grossPay: Number(data.gross_pay),
    netPay: Number(data.net_pay),
    status: payrun.status,
    lockedAt: payrun.locked_at ?? null,
    epfEmployee: Number(data.epf_employee),
    epfEmployer: Number(data.epf_employer),
    socsoEmployee: Number(data.socso_employee),
    socsoEmployer: Number(data.socso_employer),
    eisEmployee: Number(data.eis_employee),
    eisEmployer: Number(data.eis_employer),
    pcb: Number(data.pcb),
    components: {
      earnings: components.filter((row) => row.componentType === "earning"),
      deductions: components.filter((row) => row.componentType === "deduction"),
      employer: components.filter((row) => row.componentType === "employer"),
    },
  };
}
