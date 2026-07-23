import type { ComponentType, ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg fill="none" height="18" viewBox="0 0 18 18" width="18" {...props}>
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" width="5.5" x="2.25" y="2.25" />
      <rect height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" width="5.5" x="10.25" y="2.25" />
      <rect height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" width="5.5" x="2.25" y="10.25" />
      <rect height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" width="5.5" x="10.25" y="10.25" />
    </IconBase>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="12.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="13.5" x="2.25" y="3.25" />
      <path d="M2.25 7.25h13.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.25 2.25v2M11.75 2.25v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

/** Lucide calendar-days — matches Pencil Card/Stat chip icon (20×20). */
export function CalendarDaysIcon(props: IconProps) {
  return (
    <svg
      fill="none"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect height="18" rx="2" width="18" x="3" y="4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}

export function TimerIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="9.5" r="6.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 6.5v4l2.5 1.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M4.5 3.25h9v11.5l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1V3.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M6.75 7h4.5M6.75 9.5h4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function HourglassIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5.5 3.25h7M5.5 14.75h7M7.25 3.25l1.75 4.5-1.75 2.5 1.75 2.5-1.75 4.5M10.75 3.25l-1.75 4.5 1.75 2.5-1.75 2.5 1.75 4.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="13.5" x="2.25" y="4.25" />
      <path d="M2.25 7.25h13.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.75" cy="9.5" fill="currentColor" r="1" />
    </IconBase>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5.25 2.75h5.5l3 3v9.5a1 1 0 0 1-1 1h-7.5a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M10.75 2.75v3.5h3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function MegaphoneIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M3.25 8.25h3.5l5.5-3v9.5l-5.5-3h-3.5a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M13.25 6.5v5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M9 2.75a3.25 3.25 0 0 1 3.25 3.25v2.5l1.25 2.25H4.5l1.25-2.25V6a3.25 3.25 0 0 1 3.25-3.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M7.5 13.75a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M3.25 5.75 9 2.75l5.75 3v6.5L9 15.25l-5.75-3V5.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M9 9.25v6M3.25 5.75 9 9.25l5.75-3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.25 14.75V8.25M7.5 14.75V5.75M11.75 14.75v-4M16 14.75V3.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="6.25" r="2.75" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.25 14.75c.75-2.5 2.5-3.75 4.75-3.75s4 1.25 4.75 3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M9 2.75 14.25 4.75v4.5c0 3-2.25 5.25-5.25 6.25C6 14.5 3.75 12.25 3.75 9.25v-4.5L9 2.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="13.5" x="2.25" y="4.25" />
      <path d="M2.25 7.25h3.5l1.5 2h3.5l1.5-2h3.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="6.75" cy="6.75" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12.75" cy="6.75" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14.25c.5-2 1.75-3 3.75-3s3.25 1 3.75 3M10.5 14.25c.5-2 1.75-3 3.75-3s3.25 1 3.75 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="11.5" rx="1" stroke="currentColor" strokeWidth="1.5" width="10.5" x="3.75" y="3.25" />
      <path d="M7.25 6.25h1.5M9.75 6.25h1.5M7.25 9.25h1.5M9.75 9.25h1.5M7.25 12.25h1.5M9.75 12.25h1.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect height="11.5" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="9.5" x="4.25" y="4.25" />
      <path d="M7.25 4.25h3.5a1 1 0 0 1 1 1v1.5h-5.5V5.25a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 14.75V10M8 14.75V6.5M12 14.75V8.25M16 14.75V4.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function CoinsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <ellipse cx="9" cy="6.25" rx="5" ry="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 6.25v5.5c0 1.1 2.24 2 5 2s5-.9 5-2v-5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 9c0 1.1 2.24 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

export function ScrollIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5.25 3.25h6.5a2 2 0 0 1 2 2v9.5a2 2 0 0 0-2-2h-6.5V3.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M5.25 12.75h6.5a2 2 0 0 1 2 2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function KeyIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5 14.75 14.75M12.5 12.5h2.25v2.25" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.25 5.25h11.5M3.25 9h11.5M3.25 12.75h11.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m4.5 4.5 9 9m0-9-9 9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

export type PortalIconName =
  | "dashboard"
  | "leave"
  | "attendance"
  | "manual-attendance"
  | "report-late"
  | "timesheet"
  | "claims"
  | "overtime"
  | "replacement-credit"
  | "payslips"
  | "documents"
  | "calendar"
  | "announcements"
  | "notifications"
  | "assets"
  | "performance"
  | "profile"
  | "security"
  | "approvals"
  | "team-leave"
  | "team-attendance"
  | "team-calendar"
  | "team-performance"
  | "employees"
  | "organization"
  | "apply-behalf"
  | "reports"
  | "payroll"
  | "audit"
  | "login"
  | "forgot-password"
  | "reset-password"
  | "activate"
  | "register";

const iconMap = {
  dashboard: DashboardIcon,
  leave: CalendarIcon,
  attendance: TimerIcon,
  "manual-attendance": ClipboardIcon,
  "report-late": TimerIcon,
  timesheet: BarChartIcon,
  claims: ReceiptIcon,
  overtime: HourglassIcon,
  "replacement-credit": HourglassIcon,
  payslips: WalletIcon,
  documents: FileIcon,
  calendar: CalendarIcon,
  announcements: MegaphoneIcon,
  notifications: BellIcon,
  assets: BoxIcon,
  performance: ChartIcon,
  profile: UserIcon,
  security: ShieldIcon,
  approvals: InboxIcon,
  "team-leave": CalendarIcon,
  "team-attendance": TimerIcon,
  "team-calendar": CalendarIcon,
  "team-performance": ChartIcon,
  employees: UsersIcon,
  organization: BuildingIcon,
  "apply-behalf": ClipboardIcon,
  reports: BarChartIcon,
  payroll: CoinsIcon,
  audit: ScrollIcon,
  login: KeyIcon,
  "forgot-password": KeyIcon,
  "reset-password": KeyIcon,
  activate: UserIcon,
  register: BuildingIcon,
} satisfies Record<PortalIconName, ComponentType<IconProps>>;

export function PortalIcon({ name, ...props }: { name: PortalIconName } & IconProps) {
  const Icon = iconMap[name];
  return <Icon {...props} />;
}
