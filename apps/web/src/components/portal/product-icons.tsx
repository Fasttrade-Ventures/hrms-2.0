import type { ReactNode, SVGProps } from "react";

function LineIcon({
  children,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="m15 18-6-6 6-6" />
    </LineIcon>
  );
}

export function ChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="m9 18 6-6-6-6" />
    </LineIcon>
  );
}

export function Search(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </LineIcon>
  );
}

export function X(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </LineIcon>
  );
}

export function Check(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M20 6 9 17l-5-5" />
    </LineIcon>
  );
}

export function AlertCircle(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </LineIcon>
  );
}

export function Briefcase(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <rect height="12" rx="2" width="18" x="3" y="7" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </LineIcon>
  );
}

export function Building2(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </LineIcon>
  );
}

export function Calendar(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <rect height="16" rx="2" width="18" x="3" y="5" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </LineIcon>
  );
}

export function Clock(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </LineIcon>
  );
}

export function FileMinus(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 15h6" />
    </LineIcon>
  );
}

export function HeartPulse(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M19.5 12.6 12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6" />
      <path d="M3 12h4l2-3 3 6 2-3h7" />
    </LineIcon>
  );
}

export function DollarSign(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M12 2v20" />
      <path d="M17 6.5a4 4 0 0 0-4-2h-2a4 4 0 0 0 0 8h2a4 4 0 0 1 0 8h-2a4 4 0 0 1-4-2" />
    </LineIcon>
  );
}

export function FileText(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </LineIcon>
  );
}

export function Info(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </LineIcon>
  );
}

export function Megaphone(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="m3 11 14-6v14L3 13v-2z" />
      <path d="M7 14.5V19a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2v-2" />
    </LineIcon>
  );
}

export function Bell(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </LineIcon>
  );
}

export function CheckSquare(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <rect height="16" rx="2" width="16" x="4" y="4" />
      <path d="m9 12 2 2 4-4" />
    </LineIcon>
  );
}

export function Loader2(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M21 12a9 9 0 1 1-6.2-8.5" />
    </LineIcon>
  );
}

export function MapPinOff(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 0 0-10.5-4" />
      <path d="M9 9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </LineIcon>
  );
}

export function AlertTriangle(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </LineIcon>
  );
}

export function CheckCircle2(props: SVGProps<SVGSVGElement>) {
  return (
    <LineIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </LineIcon>
  );
}
