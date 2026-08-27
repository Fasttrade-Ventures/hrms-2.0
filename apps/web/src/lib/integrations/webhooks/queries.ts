"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { requireModule } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

import { WEBHOOK_EVENT_TYPES } from "./types";
import { requireOrganizationId } from "@/lib/auth/organization-context";


export async function listWebhookEndpoints() {
  await requireModule("integrations");
  await requireRole("hr_administrator");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_endpoints")
    .select("id, name, url, events_filter, status, created_at, updated_at")
    .eq("organization_id", await requireOrganizationId())
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listWebhookDeliveryLog(limit = 50) {
  await requireModule("integrations");
  await requireRole("hr_administrator");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhook_outbox")
    .select("id, event_type, destination_url, status, attempts, last_error, created_at, sent_at")
    .eq("organization_id", await requireOrganizationId())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function upsertWebhookEndpoint(
  _prev: { error?: string; success?: string },
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  try {
    await requireModule("integrations");
    await requireRole("hr_administrator");

    const id = String(formData.get("id") ?? "").trim() || null;
    const name = String(formData.get("name") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const secret = String(formData.get("secret") ?? "").trim();
    const status = String(formData.get("status") ?? "active").trim() as "active" | "inactive";
    const eventsFilter = WEBHOOK_EVENT_TYPES.filter((event) => formData.get(`event_${event}`) === "on");

    if (!name || !url) {
      return { error: "Name and URL are required." };
    }

    const organizationId = await requireOrganizationId();
    const admin = createAdminClient();

    if (id) {
      const update: Record<string, unknown> = {
        name,
        url,
        events_filter: eventsFilter,
        status,
        updated_at: new Date().toISOString(),
      };
      if (secret) update.secret = secret;

      const { error } = await admin.from("webhook_endpoints").update(update).eq("id", id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("webhook_endpoints").insert({
        organization_id: organizationId,
        name,
        url,
        secret: secret || randomUUID(),
        events_filter: eventsFilter,
        status,
      });
      if (error) throw new Error(error.message);
    }

    revalidatePath("/hr/integrations/webhooks");
    return { success: id ? "Webhook updated." : "Webhook created." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to save webhook." };
  }
}

export async function deleteWebhookEndpoint(endpointId: string): Promise<void> {
  await requireModule("integrations");
  await requireRole("hr_administrator");

  const admin = createAdminClient();
  const { error } = await admin
    .from("webhook_endpoints")
    .delete()
    .eq("id", endpointId)
    .eq("organization_id", await requireOrganizationId());

  if (error) throw new Error(error.message);
  revalidatePath("/hr/integrations/webhooks");
}
