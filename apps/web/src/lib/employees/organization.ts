import { createAdminClient } from "@/lib/supabase/admin";

import { getNextEmployeeNumberFromList } from "./generate-employee-number";

export async function getNextEmployeeNumber(organizationId: string): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("employees")
    .select("employee_number")
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return getNextEmployeeNumberFromList((data ?? []).map((row) => row.employee_number));
}
