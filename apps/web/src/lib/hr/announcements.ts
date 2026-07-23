import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  postedAt: string;
};

export async function listAnnouncements(): Promise<AnnouncementRow[]> {
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, posted_at")
    .eq("organization_id", organizationId)
    .order("posted_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    postedAt: row.posted_at,
  }));
}

export async function publishAnnouncement(input: {
  title: string;
  body: string;
  actorUserId: string;
}): Promise<void> {
  await requireRole("hr_administrator");
  const organizationId = getOrganizationId();
  const supabase = await createClient();

  const { error } = await supabase.from("announcements").insert({
    organization_id: organizationId,
    title: input.title,
    body: input.body,
    created_by_user_id: input.actorUserId,
  });

  if (error) throw new Error(error.message);
}
