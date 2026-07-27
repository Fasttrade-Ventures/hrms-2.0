"use client";

import Link from "next/link";
import { useState, useEffect, type ReactNode } from "react";

import type { PortalIconName } from "./portal-icons";
import { PortalIcon } from "./portal-icons";

export function PortalBrand() {
  return (
    <Link className="flex items-center gap-3 px-2" href="/">
      <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-primary)] text-white">
        <span className="text-lg font-bold leading-none">H</span>
      </div>
      <span className="text-xl font-bold text-[var(--foreground-primary)]">HRMS</span>
    </Link>
  );
}

export function PortalNavItem({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: PortalIconName;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      className={`flex h-10 items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-sm transition-colors ${
        active
          ? "bg-[var(--surface-accent-soft)] font-semibold text-[var(--accent-primary)]"
          : "font-medium text-[var(--foreground-secondary)] hover:bg-[var(--surface-muted)]"
      }`}
      href={href}
      onClick={onNavigate}
    >
      <PortalIcon className="shrink-0" name={icon} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function PortalAvatar({
  name,
  email,
  photoUrl,
  size = "md",
}: {
  name?: string;
  email?: string;
  photoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  const label = name?.trim() || email?.trim() || "User";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const sizeClass = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-[13px]";

  if (photoUrl && !imageFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={label}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
        onError={() => setImageFailed(true)}
        src={photoUrl}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] font-semibold text-white ${sizeClass}`}
    >
      {initials || "U"}
    </div>
  );
}

export function PortalUserMenu({
  name,
  email,
  roleHint,
}: {
  name?: string;
  email?: string;
  roleHint?: string;
}) {
  const displayName = name?.trim() || email?.split("@")[0] || "User";

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium text-[var(--foreground-primary)]">{displayName}</p>
        {roleHint || email ? (
          <p className="text-xs text-[var(--foreground-muted)]">{roleHint ?? email}</p>
        ) : null}
      </div>
      <PortalAvatar email={email} name={name} />
    </div>
  );
}

export function PortalSidebarUserBlock({
  name,
  email,
  roleHint,
  muted = false,
}: {
  name?: string;
  email?: string;
  roleHint?: string;
  muted?: boolean;
}) {
  const displayName = name?.trim() || email?.split("@")[0] || "User";

  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-3 ${
        muted ? "rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" : ""
      }`}
    >
      <PortalAvatar email={email} name={name} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-[var(--foreground-primary)]">{displayName}</p>
        {roleHint ? (
          <p className="truncate text-[11px] text-[var(--foreground-muted)]">{roleHint}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PortalBellButton({ href, unreadCount = 0 }: { href: string; unreadCount?: number }) {
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const ariaLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <Link
      aria-label={ariaLabel}
      className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
      href={href}
    >
      <PortalIcon name="notifications" />
      {unreadCount > 0 ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[10px] font-semibold leading-none text-white">
          {badgeLabel}
        </span>
      ) : null}
    </Link>
  );
}

export function PortalPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground-primary)] sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[var(--foreground-secondary)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
    </div>
  );
}
