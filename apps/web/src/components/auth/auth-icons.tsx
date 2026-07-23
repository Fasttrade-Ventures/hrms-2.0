import type { ReactNode, SVGProps } from "react";

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <path
        d="M13.333 4 6 11.333 2.667 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CircleCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="16" viewBox="0 0 16 16" width="16" {...props}>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.25 8 7 9.75 10.75 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18" {...props}>
      <path
        d="M1.5 9s2.75-5.25 7.5-5.25S16.5 9 16.5 9s-2.75 5.25-7.5 5.25S1.5 9 1.5 9Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18" {...props}>
      <path
        d="M3 3 15 15M7.2 7.35A2.25 2.25 0 0 0 9 11.25M4.12 4.62C2.43 5.84 1.5 7.5 1.5 9s2.75 5.25 7.5 5.25c1.2 0 2.3-.28 3.28-.77M11.1 11.1A2.25 2.25 0 0 1 7.65 6.9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="24" viewBox="0 0 24 24" width="24" {...props}>
      <rect height="14" rx="1" stroke="currentColor" strokeWidth="1.5" width="18" x="3" y="5" />
      <path
        d="m3 7 9 6 9-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18" {...props}>
      <path
        d="m4.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
        transform="translate(0 1)"
      />
    </svg>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--border-primary)]" />
      <span className="text-xs text-[var(--foreground-muted)]">{label}</span>
      <div className="h-px flex-1 bg-[var(--border-primary)]" />
    </div>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p className="border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
      {children}
    </p>
  );
}
