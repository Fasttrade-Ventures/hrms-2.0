import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export async function resolveBranchEmployerCodes(branchId: string | null): Promise<{
  employerEpfNumber: string;
  employerSocsoCode: string;
}> {
  if (!branchId) {
    return {
      employerEpfNumber: process.env.DEFAULT_EPF_EMPLOYER_NUMBER ?? "",
      employerSocsoCode: process.env.DEFAULT_SOCSO_EMPLOYER_CODE ?? "",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("epf_employer_number, socso_employer_code")
    .eq("id", branchId)
    .eq("organization_id", getOrganizationId())
    .maybeSingle();

  return {
    employerEpfNumber: data?.epf_employer_number ?? process.env.DEFAULT_EPF_EMPLOYER_NUMBER ?? "",
    employerSocsoCode: data?.socso_employer_code ?? process.env.DEFAULT_SOCSO_EMPLOYER_CODE ?? "",
  };
}
