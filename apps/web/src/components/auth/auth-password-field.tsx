"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { EyeIcon, EyeOffIcon } from "./auth-icons";

export function AuthPasswordField({
  id,
  label,
  name,
  autoComplete,
  required,
  action,
}: {
  id: string;
  label: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  action?: ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-[13px] font-medium text-[var(--foreground-primary)]" htmlFor={id}>
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className="h-10 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-card)] px-3.5 pr-11 text-[15px] text-[var(--foreground-primary)] outline-none placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-focus)]"
          id={id}
          name={name}
          placeholder="••••••••"
          required={required}
          type={visible ? "text" : "password"}
        />
        <button
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[var(--foreground-muted)]"
          onClick={() => setVisible((value) => !value)}
          type="button"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

export function AuthLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-[13px] font-medium text-[var(--accent-primary)] hover:text-[var(--accent-hover)]" href={href}>
      {children}
    </Link>
  );
}
