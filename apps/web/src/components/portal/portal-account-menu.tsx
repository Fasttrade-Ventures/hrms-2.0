"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { PortalIcon } from "@/components/portal/portal-icons";
import { PortalAvatar } from "@/components/portal/portal-primitives";

export function PortalAccountMenu({
  name,
  email,
  profileHref,
  settingsHref,
  integrationsHref,
}: {
  name?: string;
  email?: string;
  profileHref: string;
  settingsHref: string;
  integrationsHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayName = name?.trim() || email?.split("@")[0] || "User";

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1 transition-colors hover:bg-[var(--surface-muted)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <PortalAvatar email={email} name={name} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-[var(--foreground-primary)]">{displayName}</span>
          {email ? <span className="block text-xs text-[var(--foreground-muted)]">{email}</span> : null}
        </span>
        <svg
          aria-hidden
          className="hidden text-[var(--foreground-muted)] sm:block"
          fill="none"
          height="14"
          viewBox="0 0 24 24"
          width="14"
        >
          <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.75" />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-50 mt-2 w-[220px] overflow-hidden rounded-[12px] border border-[var(--border-primary)] bg-[var(--surface-card)] p-1.5 shadow-[var(--shadow-elevated)]"
          role="menu"
        >
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <PortalAvatar email={email} name={name} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--foreground-primary)]">{displayName}</p>
              {email ? <p className="truncate text-[11px] text-[var(--foreground-muted)]">{email}</p> : null}
            </div>
          </div>

          <div className="my-1 h-px bg-[var(--border-primary)]" />

          <Link
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
            href={profileHref}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <PortalIcon name="profile" />
            Profile
          </Link>

          <Link
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
            href={settingsHref}
            onClick={() => setOpen(false)}
            role="menuitem"
          >
            <PortalIcon name="security" />
            Settings
          </Link>

          {integrationsHref ? (
            <Link
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13px] font-medium text-[var(--foreground-primary)] hover:bg-[var(--surface-muted)]"
              href={integrationsHref}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              <PortalIcon name="organization" />
              Integrations
            </Link>
          ) : null}

          <form action="/api/auth/logout" method="post">
            <button
              className="flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              role="menuitem"
              type="submit"
            >
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.75"
                />
              </svg>
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
