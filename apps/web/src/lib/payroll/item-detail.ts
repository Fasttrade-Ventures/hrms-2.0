import type { PayrunLineItem } from "@/lib/payroll/queries";

export type PayrunItemComponentRow = {
  code: string;
  name: string;
  componentType: string;
  amount: number;
};

export async function listPayrunItemComponents(
  payrunItemId: string,
): Promise<PayrunItemComponentRow[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) return [];

  const { data, error } = await supabase
    .from("payroll_item_components")
    .select("amount, payroll_components(code, name, component_type)")
    .eq("payrun_item_id", payrunItemId)
    .eq("organization_id", organizationId)
    .order("created_at");

  if (error) throw new Error(error.message);

  return (data ?? []).flatMap((row) => {
    const component = Array.isArray(row.payroll_components)
      ? row.payroll_components[0]
      : row.payroll_components;
    if (!component) return [];
    return [
      {
        code: component.code,
        name: component.name,
        componentType: component.component_type,
        amount: Number(row.amount),
      },
    ];
  });
}

export function groupComponents(components: PayrunItemComponentRow[]) {
  return {
    earnings: components.filter((row) => row.componentType === "earning"),
    deductions: components.filter((row) => row.componentType === "deduction"),
    employer: components.filter((row) => row.componentType === "employer"),
  };
}

export type { PayrunLineItem };
