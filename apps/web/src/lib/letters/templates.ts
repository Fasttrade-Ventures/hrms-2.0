import type {
  CreateLetterTemplateInput,
  LetterTemplateType,
  UpdateLetterTemplateInput,
} from "@hrms/validation";
import { createLetterTemplateSchema, updateLetterTemplateSchema } from "@hrms/validation";

import { requireOrganizationId } from "@/lib/auth/organization-context";
import { hardDeleteOrganizationFile } from "@/lib/files/storage";
import { createAdminClient } from "@/lib/supabase/admin";

import { sanitizeLetterHtml } from "./html-text";

export type LetterTemplateRow = {
  id: string;
  name: string;
  type: LetterTemplateType;
  body: string;
  letterhead_file_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const COLUMNS = "id, name, type, body, letterhead_file_id, is_active, created_at, updated_at";

export async function listLetterTemplates(filter?: {
  type?: LetterTemplateType;
}): Promise<LetterTemplateRow[]> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  let query = admin
    .from("hr_letter_templates")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .order("type", { ascending: true })
    .order("name", { ascending: true });
  if (filter?.type) query = query.eq("type", filter.type);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LetterTemplateRow[];
}

export async function listActiveTemplatesByType(type: LetterTemplateType): Promise<LetterTemplateRow[]> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("hr_letter_templates")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .eq("type", type)
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as LetterTemplateRow[];
}

export async function getLetterTemplate(templateId: string): Promise<LetterTemplateRow | null> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("hr_letter_templates")
    .select(COLUMNS)
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as LetterTemplateRow | null) ?? null;
}

export async function createLetterTemplate(
  input: CreateLetterTemplateInput,
  actorUserId: string,
): Promise<{ templateId: string }> {
  const parsed = createLetterTemplateSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("hr_letter_templates")
    .insert({
      organization_id: organizationId,
      name: parsed.name,
      type: parsed.type,
      body: sanitizeLetterHtml(parsed.body),
      letterhead_file_id: parsed.letterheadFileId ?? null,
      is_active: parsed.isActive,
      created_by: actorUserId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create template.");
  return { templateId: data.id };
}

export async function updateLetterTemplate(input: UpdateLetterTemplateInput): Promise<void> {
  const parsed = updateLetterTemplateSchema.parse(input);
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data: existing } = await admin
    .from("hr_letter_templates")
    .select("letterhead_file_id")
    .eq("id", parsed.templateId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) throw new Error("Template not found.");

  const { data, error } = await admin
    .from("hr_letter_templates")
    .update({
      name: parsed.name,
      type: parsed.type,
      body: sanitizeLetterHtml(parsed.body),
      is_active: parsed.isActive,
      ...(parsed.letterheadFileId !== undefined ? { letterhead_file_id: parsed.letterheadFileId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.templateId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Template not found.");

  const previous = existing.letterhead_file_id as string | null;
  if (parsed.letterheadFileId !== undefined && previous && previous !== parsed.letterheadFileId) {
    await hardDeleteOrganizationFile(previous).catch(() => undefined);
  }
}

export async function setLetterTemplateActive(templateId: string, isActive: boolean): Promise<void> {
  const admin = createAdminClient();
  const organizationId = await requireOrganizationId();

  const { data, error } = await admin
    .from("hr_letter_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("organization_id", organizationId)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Template not found.");
}
