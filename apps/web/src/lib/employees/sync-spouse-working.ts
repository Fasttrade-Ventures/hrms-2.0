/* eslint-disable @typescript-eslint/no-explicit-any -- shared helper for admin + server supabase clients */

/** Keep employee_tax_profiles.spouse_working aligned with Family tab spouse. */
export async function syncSpouseWorkingToTaxProfile(
  client: any,
  organizationId: string,
  employeeId: string,
  spouseWorking: boolean | null,
): Promise<void> {
  const { data: existing, error: existingError } = await client
    .from("employee_tax_profiles")
    .select("employee_id")
    .eq("employee_id", employeeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await client
      .from("employee_tax_profiles")
      .update({
        spouse_working: spouseWorking,
        updated_at: new Date().toISOString(),
      })
      .eq("employee_id", employeeId)
      .eq("organization_id", organizationId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await client.from("employee_tax_profiles").insert({
    employee_id: employeeId,
    organization_id: organizationId,
    spouse_working: spouseWorking,
    zakat_annual: 0,
    zakat_monthly: 0,
    tp1_payload: { otherReliefs: 0 },
  });
  if (error) throw new Error(error.message);
}

/** Keep Family tab spouse.is_working aligned with TP1 spouse working. */
export async function syncSpouseWorkingToDependent(
  client: any,
  organizationId: string,
  employeeId: string,
  spouseWorking: boolean | null,
): Promise<void> {
  const { data: spouse, error: spouseError } = await client
    .from("employee_dependents")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("dependent_type", "spouse")
    .maybeSingle();

  if (spouseError) throw new Error(spouseError.message);
  if (!spouse?.id) return;

  const { error } = await client
    .from("employee_dependents")
    .update({ is_working: spouseWorking })
    .eq("id", spouse.id)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}
