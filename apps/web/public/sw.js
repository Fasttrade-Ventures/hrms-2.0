// Service Worker for BukuHR Web Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "BukuHR Notification",
      body: event.data.text(),
    };
  }

  const title = payload.title || "BukuHR Notification";
  const options = {
    body: payload.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: payload.tag || "bukuhr-notification",
    data: {
      url: payload.url || "/manager/approvals",
      ...(payload.data || {}),
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/manager/approvals";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});
