import { createClient } from "@/lib/supabase/server";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function markAnnouncementRead(input: {
  announcementId: string;
  userId: string;
}): Promise<void> {
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase.from("announcement_reads").upsert(
    {
      organization_id: organizationId,
      announcement_id: input.announcementId,
      user_id: input.userId,
      read_at: new Date().toISOString(),
    },
    { onConflict: "announcement_id,user_id" },
  );

  if (error) throw new Error(error.message);
}

export async function getReadAnnouncementIds(userId: string): Promise<Set<string>> {
  const organizationId = await requireOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((row) => row.announcement_id));
}
