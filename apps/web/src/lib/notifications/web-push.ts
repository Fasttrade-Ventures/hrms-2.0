import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Fallback development VAPID keys if none provided in environment
const DEFAULT_DEV_VAPID_PUBLIC =
  "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const DEFAULT_DEV_VAPID_PRIVATE = "UUxI2qFj7v6mN-C5s_bE6xQ7v1v4uBqX6yB0iV8n_sM";
const DEFAULT_VAPID_SUBJECT = "mailto:notifications@bukuhr.com";

let vapidConfigured = false;

export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_DEV_VAPID_PUBLIC;
}

function getWebPushClient() {
  const client = webpush as unknown as typeof webpush & { default?: typeof webpush };
  return client.default || client;
}

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const client = getWebPushClient();
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_DEV_VAPID_PRIVATE;
  const subject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

  try {
    client.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (err) {
    console.warn("Failed to initialize VAPID credentials for Web Push:", err);
    return false;
  }
}

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export async function sendWebPushNotification(params: {
  organizationId: string;
  recipientUserId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}): Promise<{ sent: number; failed: number }> {
  if (!params.recipientUserId) return { sent: 0, failed: 0 };

  const ready = ensureVapidConfigured();
  if (!ready) return { sent: 0, failed: 0 };

  let subscriptions: PushSubscriptionRow[] = [];
  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
    const { data, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("organization_id", params.organizationId)
      .eq("user_id", params.recipientUserId);

    if (error || !data) return { sent: 0, failed: 0 };
    subscriptions = data as PushSubscriptionRow[];
  } catch {
    return { sent: 0, failed: 0 };
  }

  if (subscriptions.length === 0) return { sent: 0, failed: 0 };

  const payload: WebPushPayload = {
    title: params.title,
    body: params.body,
    url: params.url,
    tag: params.tag,
    data: params.data,
  };

  const payloadString = JSON.stringify(payload);
  const client = getWebPushClient();
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await client.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payloadString,
          {
            TTL: 60 * 60 * 24, // 24 hours
            urgency: "high",
          },
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const statusCode = (err as { statusCode?: number })?.statusCode;
        // 404 or 410 indicates the subscription is expired or cancelled by browser
        if (statusCode === 404 || statusCode === 410) {
          try {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          } catch {
            // Ignore deletion failures
          }
        }
      }
    }),
  );

  return { sent, failed };
}
