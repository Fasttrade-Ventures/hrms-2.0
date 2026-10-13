"use client";

import { useEffect } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let isMounted = true;

    async function initPush() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        // Only auto-subscribe if user previously granted notification permission
        if (Notification.permission === "granted") {
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            const res = await fetch("/api/notifications/push/vapid-public-key");
            if (!res.ok) return;
            const { publicKey } = await res.json();
            if (!publicKey) return;

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
          }

          if (subscription && isMounted) {
            const subJson = subscription.toJSON();
            await fetch("/api/notifications/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: subscription.endpoint,
                keys: subJson.keys,
                userAgent: navigator.userAgent,
              }),
            });
          }
        }
      } catch (err) {
        // Push notification registration is progressive and must never break page rendering
        console.warn("Web Push initialization note:", err);
      }
    }

    initPush();

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}
