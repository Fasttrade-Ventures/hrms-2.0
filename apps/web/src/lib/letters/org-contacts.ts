import { createAdminClient } from "@/lib/supabase/admin";

export type OrganizationLetterContacts = {
  companyEmail: string | null;
  companyPhone: string | null;
};

export async function getOrganizationLetterContacts(
  organizationId: string,
): Promise<OrganizationLetterContacts> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("company_email, company_phone")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    companyEmail: (data?.company_email as string | null | undefined) ?? null,
    companyPhone: (data?.company_phone as string | null | undefined) ?? null,
  };
}

export async function setOrganizationLetterContacts(
  organizationId: string,
  input: { companyEmail: string | null; companyPhone: string | null },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({
      company_email: input.companyEmail,
      company_phone: input.companyPhone,
    })
    .eq("id", organizationId);
  if (error) throw new Error(error.message);
}
