import type { PortalIconName } from "@/components/portal/portal-icons";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: PortalIconName;
};

const employeeNav: PortalNavItem[] = [
  { href: "/employee/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/employee/leave", label: "Leave", icon: "leave" },
  { href: "/employee/attendance", label: "Attendance", icon: "attendance" },
  { href: "/employee/manual-attendance", label: "Manual attendance", icon: "manual-attendance" },
  { href: "/employee/report-late", label: "Report late", icon: "report-late" },
  { href: "/employee/timesheet", label: "Timesheet", icon: "timesheet" },
  { href: "/employee/claims", label: "Claims", icon: "claims" },
  { href: "/employee/overtime", label: "Overtime", icon: "overtime" },
  { href: "/employee/replacement-credit", label: "Replacement credit", icon: "replacement-credit" },
  { href: "/employee/payslips", label: "Payslips", icon: "payslips" },
  { href: "/employee/documents", label: "Documents", icon: "documents" },
  { href: "/employee/calendar", label: "Calendar", icon: "calendar" },
  { href: "/employee/announcements", label: "Announcements", icon: "announcements" },
  { href: "/employee/notifications", label: "Notifications", icon: "notifications" },
  { href: "/employee/assets", label: "My assets", icon: "assets" },
  { href: "/employee/performance", label: "Performance", icon: "performance" },
  { href: "/employee/profile", label: "Profile", icon: "profile" },
  { href: "/employee/profile/security", label: "Security", icon: "security" },
];

const managerNav: PortalNavItem[] = [
  { href: "/manager/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/manager/approvals", label: "Approvals", icon: "approvals" },
  { href: "/manager/team-leave", label: "Team leave", icon: "team-leave" },
  { href: "/manager/team-attendance", label: "Team attendance", icon: "team-attendance" },
  { href: "/manager/team-calendar", label: "Team calendar", icon: "team-calendar" },
  { href: "/manager/team-performance", label: "Team performance", icon: "team-performance" },
  { href: "/manager/notifications", label: "Notifications", icon: "notifications" },
  { href: "/manager/profile", label: "Profile", icon: "profile" },
  { href: "/manager/profile/security", label: "Security", icon: "security" },
];

const hrNav: PortalNavItem[] = [
  { href: "/hr/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/hr/employees", label: "Employees", icon: "employees" },
  { href: "/hr/organization", label: "Organization", icon: "organization" },
  { href: "/hr/apply-behalf", label: "Apply behalf", icon: "apply-behalf" },
  { href: "/hr/documents", label: "Documents", icon: "documents" },
  { href: "/hr/announcements", label: "Announcements", icon: "announcements" },
  { href: "/hr/calendar", label: "Calendar", icon: "calendar" },
  { href: "/hr/reports", label: "Reports", icon: "reports" },
  { href: "/hr/payroll", label: "Payroll", icon: "payroll" },
  { href: "/hr/assets", label: "Assets", icon: "assets" },
  { href: "/hr/audit", label: "Audit", icon: "audit" },
  { href: "/hr/profile", label: "Profile", icon: "profile" },
  { href: "/hr/profile/security", label: "Security", icon: "security" },
];

const authNav: PortalNavItem[] = [
  { href: "/auth/login", label: "Login", icon: "login" },
  { href: "/auth/forgot-password", label: "Forgot password", icon: "forgot-password" },
  { href: "/auth/reset-password", label: "Reset password", icon: "reset-password" },
  { href: "/auth/activate", label: "Activate account", icon: "activate" },
  { href: "/auth/register", label: "Register organization", icon: "register" },
];

const singleDashboard = (prefix: string, label: string): PortalNavItem[] => [
  { href: `${prefix}/dashboard`, label, icon: "dashboard" },
];

export function getPortalNav(portal: string): PortalNavItem[] {
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

export function getPortalLabel(portal: string): string {
  return portal;
}
