import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { DocumentFolderInput } from "@hrms/validation";

function getOrganizationId(): string {
  const organizationId = process.env.DEFAULT_ORGANIZATION_ID;
  if (!organizationId) throw new Error("DEFAULT_ORGANIZATION_ID is not configured.");
  return organizationId;
}

export type DocumentFolderRow = {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  accessRoles: string[];
  createdAt: string;
};

export async function listDocumentFolders(): Promise<DocumentFolderRow[]> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { data, error } = await supabase
    .from("document_folders")
    .select("id, name, parent_id, access_roles, created_at")
    .eq("organization_id", organizationId)
    .order("name");

  if (error) throw new Error(error.message);

  const byId = new Map((data ?? []).map((row) => [row.id, row.name]));

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    parentName: row.parent_id ? (byId.get(row.parent_id) ?? null) : null,
    accessRoles: row.access_roles ?? [],
    createdAt: row.created_at,
  }));
}

export async function createDocumentFolder(input: DocumentFolderInput): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  if (input.parentId) {
    const { data: parent } = await supabase
      .from("document_folders")
      .select("parent_id")
      .eq("id", input.parentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!parent) throw new Error("Parent folder not found.");
    if (parent.parent_id) {
      throw new Error("Folders can only be nested one level deep.");
    }
  }

  const { error } = await supabase.from("document_folders").insert({
    organization_id: organizationId,
    name: input.name,
    parent_id: input.parentId ?? null,
    access_roles: input.accessRoles,
  });

  if (error) throw new Error(error.message);
}

export async function updateDocumentFolder(
  folderId: string,
  input: DocumentFolderInput,
): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  if (input.parentId) {
    if (input.parentId === folderId) throw new Error("A folder cannot be its own parent.");

    const { data: parent } = await supabase
      .from("document_folders")
      .select("parent_id")
      .eq("id", input.parentId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (!parent) throw new Error("Parent folder not found.");
    if (parent.parent_id) {
      throw new Error("Folders can only be nested one level deep.");
    }
  }

  const { error } = await supabase
    .from("document_folders")
    .update({
      name: input.name,
      parent_id: input.parentId ?? null,
      access_roles: input.accessRoles,
    })
    .eq("id", folderId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}

export async function deleteDocumentFolder(folderId: string): Promise<void> {
  await requireRole("hr_administrator");
  const supabase = await createClient();
  const organizationId = getOrganizationId();

  const { count, error: childError } = await supabase
    .from("document_folders")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", folderId)
    .eq("organization_id", organizationId);

  if (childError) throw new Error(childError.message);
  if ((count ?? 0) > 0) {
    throw new Error("Remove child folders before deleting this folder.");
  }

  const { error } = await supabase
    .from("document_folders")
    .delete()
    .eq("id", folderId)
    .eq("organization_id", organizationId);

  if (error) throw new Error(error.message);
}
