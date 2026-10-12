import { describe, expect, it, vi, beforeEach } from "vitest";

const { sendNotificationMock, setVapidDetailsMock, mockPushSubscriptions } = vi.hoisted(() => ({
  sendNotificationMock: vi.fn().mockResolvedValue({ statusCode: 201 }),
  setVapidDetailsMock: vi.fn(),
  mockPushSubscriptions: [
    {
      id: "sub-1",
      organization_id: "org-1",
      user_id: "user-mgr-1",
      endpoint: "https://fcm.googleapis.com/fcm/send/test-sub-1",
      p256dh: "key-p256dh-1",
      auth: "key-auth-1",
    },
    {
      id: "sub-2",
      organization_id: "org-1",
      user_id: "user-mgr-1",
      endpoint: "https://updates.push.services.mozilla.com/wpush/v2/test-sub-2",
      p256dh: "key-p256dh-2",
      auth: "key-auth-2",
    },
  ],
}));

vi.mock("web-push", () => {
  const api = {
    setVapidDetails: setVapidDetailsMock,
    sendNotification: sendNotificationMock,
  };
  return {
    default: api,
    ...api,
  };
});

import { getVapidPublicKey, sendWebPushNotification } from "../../apps/web/src/lib/notifications/web-push";

vi.mock("@/lib/supabase/admin", () => {
  return {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === "push_subscriptions") {
          return {
            select: () => ({
              eq: (col1: string, val1: string) => ({
                eq: (col2: string, val2: string) => {
                  if (val2 === "user-mgr-1") {
                    return Promise.resolve({ data: mockPushSubscriptions, error: null });
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              }),
            }),
            delete: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        };
      },
    }),
  };
});

describe("Web Push Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provides a valid VAPID public key", () => {
    const key = getVapidPublicKey();
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(20);
  });

  it("sends web push notifications to all registered devices of the manager", async () => {
    const result = await sendWebPushNotification({
      organizationId: "org-1",
      recipientUserId: "user-mgr-1",
      title: "Leave Request Cancelled",
      body: "Ali Ahmad cancelled their leave request.",
      url: "/manager/approvals/step-123",
      tag: "leave-cancelled-req-123",
    });

    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("handles users with zero registered push subscriptions gracefully", async () => {
    const result = await sendWebPushNotification({
      organizationId: "org-1",
      recipientUserId: "user-no-devices",
      title: "Claim Revoked",
      body: "Employee revoked approved claim.",
    });

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
  });
});
