"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "bukuhr-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isEmployeePortal(pathname: string | null) {
  return pathname === "/employee" || (pathname?.startsWith("/employee/") ?? false);
}

function isIosDevice() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports as a Mac with touch support.
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const pathname = usePathname();
  const onEmployeePortal = isEmployeePortal(pathname);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!onEmployeePortal) return;

    setDismissed(readDismissed() || isStandalone());

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // If the browser does not offer the install event, iPhone/iPad Safari
    // needs manual instructions. Give the event a moment to fire first.
    const timer = window.setTimeout(() => setShowIosHint(isIosDevice()), 1500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(timer);
    };
  }, [onEmployeePortal]);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Storage can be blocked; still hide for this page view.
    }
    setDismissed(true);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setInstallEvent(null);
    dismiss();
  }

  if (!onEmployeePortal || dismissed) return null;
  if (!installEvent && !showIosHint) return null;

  return (
    <div
      role="region"
      aria-label="Install BukuHR"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-lg border bg-background px-4 py-3 text-sm shadow-lg"
    >
      {installEvent ? (
        <>
          <span>Add BukuHR to your home screen</span>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={install}>
              Install
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Dismiss
            </Button>
          </div>
        </>
      ) : (
        <>
          <span>Share, then Add to Home Screen</span>
          <Button size="sm" variant="ghost" onClick={dismiss}>
            Dismiss
          </Button>
        </>
      )}
    </div>
  );
}
