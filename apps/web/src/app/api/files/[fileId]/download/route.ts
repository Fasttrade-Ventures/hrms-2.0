import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { canDownloadFile } from "@/lib/files/download-auth";
import { getSignedDownloadUrl } from "@/lib/files/storage";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: file } = await admin
    .from("file_objects")
    .select("category")
    .eq("id", fileId)
    .is("deleted_at", null)
    .maybeSingle();

  const moduleKey = file?.category === "announcement-attachments" ? "announcements" : "documents";

  try {
    requireModule(moduleKey);
  } catch {
    return NextResponse.json({ error: `${moduleKey} module is not enabled.` }, { status: 403 });
  }

  const allowed = await canDownloadFile({
    roles: session.membership.roles,
    employeeId: session.membership.employeeId,
    fileId,
    organizationId: session.membership.organizationId,
  });

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = await getSignedDownloadUrl(fileId);
  if (!url) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.redirect(url);
}
