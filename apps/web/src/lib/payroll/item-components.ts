import type { EmployeePayrunResult, PayrunLine } from "@hrms/domain";

export type PayrunItemComponentInsert = {
  payrun_item_id: string;
  organization_id: string;
  component_id: string;
  amount: string;
};

export function buildPayrunItemComponentRows(
  payrunItemId: string,
  organizationId: string,
  componentIdByCode: Map<string, string>,
  lines: PayrunLine[],
  result: EmployeePayrunResult,
): PayrunItemComponentInsert[] {
  const rows: PayrunItemComponentInsert[] = [];

  const push = (code: string, amount: number) => {
    if (amount === 0) return;
    const componentId = componentIdByCode.get(code);
    if (!componentId) return;
    rows.push({
      payrun_item_id: payrunItemId,
      organization_id: organizationId,
      component_id: componentId,
      amount: amount.toFixed(2),
    });
  };

  for (const line of lines) {
    push(line.code, line.amount.toNumber());
  }

  push("DED_EPF", result.epfEmployee.toNumber());
  push("DED_SOCSO", result.socsoEmployee.toNumber());
  push("DED_EIS", result.eisEmployee.toNumber());
  push("DED_PCB", result.pcb.toNumber());
  push("DED_LINDUNG", result.lindungEmployee.toNumber());
  push("DED_ZAKAT", result.zakatDeduction.toNumber());
  push("ER_EPF", result.epfEmployer.toNumber());
  push("ER_SOCSO", result.socsoEmployer.toNumber());
  push("ER_EIS", result.eisEmployer.toNumber());
  push("ER_HRDF", result.hrdfEmployer.toNumber());
  push("ER_LINDUNG", result.lindungEmployer.toNumber());

  return rows;
}
