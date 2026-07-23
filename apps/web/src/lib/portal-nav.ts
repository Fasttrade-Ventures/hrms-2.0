import type { PortalIconName } from "@/components/portal/portal-icons";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: PortalIconName;
};

export type PortalNavSection = {
  label?: string;
  items: PortalNavItem[];
};

const employeeNav: PortalNavSection[] = [
  {
    items: [{ href: "/employee/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Time & leave",
    items: [
      { href: "/employee/leave", label: "Leave", icon: "leave" },
      { href: "/employee/attendance", label: "Attendance", icon: "attendance" },
      { href: "/employee/manual-attendance", label: "Manual attendance", icon: "manual-attendance" },
      { href: "/employee/report-late", label: "Report late", icon: "report-late" },
      { href: "/employee/timesheet", label: "Timesheet", icon: "timesheet" },
      { href: "/employee/overtime", label: "Overtime", icon: "overtime" },
      { href: "/employee/replacement-credit", label: "Replacement credit", icon: "replacement-credit" },
    ],
  },
  {
    label: "Pay & claims",
    items: [
      { href: "/employee/claims", label: "Claims", icon: "claims" },
      { href: "/employee/payslips", label: "Payslips", icon: "payslips" },
    ],
  },
  {
    label: "Workplace",
    items: [
      { href: "/employee/documents", label: "Documents", icon: "documents" },
      { href: "/employee/calendar", label: "Calendar", icon: "calendar" },
      { href: "/employee/announcements", label: "Announcements", icon: "announcements" },
      { href: "/employee/notifications", label: "Notifications", icon: "notifications" },
      { href: "/employee/assets", label: "My assets", icon: "assets" },
      { href: "/employee/performance", label: "Performance", icon: "performance" },
    ],
  },
];

const managerNav: PortalNavSection[] = [
  {
    items: [{ href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Approvals",
    items: [{ href: "/manager/approvals", label: "Approvals", icon: "approvals" }],
  },
  {
    label: "My team",
    items: [
      { href: "/manager/team-leave", label: "Team leave", icon: "team-leave" },
      { href: "/manager/team-attendance", label: "Team attendance", icon: "team-attendance" },
      { href: "/manager/team-calendar", label: "Team calendar", icon: "team-calendar" },
      { href: "/manager/team-performance", label: "Team performance", icon: "team-performance" },
    ],
  },
  {
    label: "Inbox",
    items: [{ href: "/manager/notifications", label: "Notifications", icon: "notifications" }],
  },
];

/** HR Admin — categorized to match product IA (Profile lives in topbar menu). */
const hrNav: PortalNavSection[] = [
  {
    items: [{ href: "/hr/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "People",
    items: [
      { href: "/hr/employees", label: "Employees", icon: "employees" },
      { href: "/hr/organization", label: "Organization", icon: "organization" },
      { href: "/hr/apply-behalf", label: "Apply behalf", icon: "apply-behalf" },
    ],
  },
  {
    label: "Workplace",
    items: [
      { href: "/hr/documents", label: "Documents", icon: "documents" },
      { href: "/hr/announcements", label: "Announcements", icon: "announcements" },
      { href: "/hr/calendar", label: "Calendar", icon: "calendar" },
      { href: "/hr/assets", label: "Assets", icon: "assets" },
    ],
  },
  {
    label: "Finance & compliance",
    items: [
      { href: "/hr/reports", label: "Reports", icon: "reports" },
      { href: "/hr/payroll", label: "Payroll", icon: "payroll" },
      { href: "/hr/audit", label: "Audit", icon: "audit" },
    ],
  },
];

const authNav: PortalNavSection[] = [
  {
    items: [
      { href: "/auth/login", label: "Login", icon: "login" },
      { href: "/auth/forgot-password", label: "Forgot password", icon: "forgot-password" },
      { href: "/auth/reset-password", label: "Reset password", icon: "reset-password" },
      { href: "/auth/activate", label: "Activate account", icon: "activate" },
      { href: "/auth/register", label: "Register organization", icon: "register" },
    ],
  },
];

const singleDashboard = (prefix: string, label: string): PortalNavSection[] => [
  { items: [{ href: `${prefix}/dashboard`, label, icon: "dashboard" }] },
];

export function getPortalNavSections(portal: string): PortalNavSection[] {
  switch (portal) {
    case "Auth":
      return authNav;
    case "Employee":
      return employeeNav;
    case "Manager":
      return managerNav;
    case "HR Administrator":
      return hrNav;
    case "Branch Admin":
      return singleDashboard("/branch-admin", "Dashboard");
    case "Director":
      return singleDashboard("/director", "Dashboard");
    case "Organization Owner":
      return singleDashboard("/owner", "Dashboard");
    case "Platform Admin":
      return singleDashboard("/platform", "Dashboard");
    default:
      return [];
  }
}

/** Flat list for active-path / page-title lookups. */
export function getPortalNav(portal: string): PortalNavItem[] {
  return getPortalNavSections(portal).flatMap((section) => section.items);
}

export function getPortalLabel(portal: string): string {
  return portal;
}

export function getPortalProfileHref(portal: string): string {
  if (portal === "Manager") return "/manager/profile";
  if (portal === "HR Administrator") return "/hr/profile";
  return "/employee/profile";
}

export function getPortalSettingsHref(portal: string): string {
  if (portal === "Manager") return "/manager/profile/security";
  if (portal === "HR Administrator") return "/hr/profile/security";
  return "/employee/profile/security";
}
