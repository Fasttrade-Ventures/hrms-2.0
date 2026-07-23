export type PortalNavItem = {
  href: string;
  label: string;
};

const employeeNav: PortalNavItem[] = [
  { href: "/employee/dashboard", label: "Dashboard" },
  { href: "/employee/leave", label: "Leave" },
  { href: "/employee/attendance", label: "Attendance" },
  { href: "/employee/manual-attendance", label: "Manual attendance" },
  { href: "/employee/report-late", label: "Report late" },
  { href: "/employee/timesheet", label: "Timesheet" },
  { href: "/employee/claims", label: "Claims" },
  { href: "/employee/overtime", label: "Overtime" },
  { href: "/employee/replacement-credit", label: "Replacement credit" },
  { href: "/employee/payslips", label: "Payslips" },
  { href: "/employee/documents", label: "Documents" },
  { href: "/employee/calendar", label: "Calendar" },
  { href: "/employee/announcements", label: "Announcements" },
  { href: "/employee/notifications", label: "Notifications" },
  { href: "/employee/assets", label: "My assets" },
  { href: "/employee/performance", label: "Performance" },
  { href: "/employee/profile", label: "Profile" },
  { href: "/employee/profile/security", label: "Security" },
];

const managerNav: PortalNavItem[] = [
  { href: "/manager/dashboard", label: "Dashboard" },
  { href: "/manager/approvals", label: "Approvals" },
  { href: "/manager/team-leave", label: "Team leave" },
  { href: "/manager/team-attendance", label: "Team attendance" },
  { href: "/manager/team-calendar", label: "Team calendar" },
  { href: "/manager/team-performance", label: "Team performance" },
  { href: "/manager/notifications", label: "Notifications" },
  { href: "/manager/profile", label: "Profile" },
  { href: "/manager/profile/security", label: "Security" },
];

const hrNav: PortalNavItem[] = [
  { href: "/hr/dashboard", label: "Dashboard" },
  { href: "/hr/employees", label: "Employees" },
  { href: "/hr/organization", label: "Organization" },
  { href: "/hr/apply-behalf", label: "Apply behalf" },
  { href: "/hr/documents", label: "Documents" },
  { href: "/hr/announcements", label: "Announcements" },
  { href: "/hr/calendar", label: "Calendar" },
  { href: "/hr/reports", label: "Reports" },
  { href: "/hr/payroll", label: "Payroll" },
  { href: "/hr/assets", label: "Assets" },
  { href: "/hr/audit", label: "Audit" },
  { href: "/hr/profile", label: "Profile" },
  { href: "/hr/profile/security", label: "Security" },
];

const authNav: PortalNavItem[] = [
  { href: "/auth/login", label: "Login" },
  { href: "/auth/forgot-password", label: "Forgot password" },
  { href: "/auth/reset-password", label: "Reset password" },
  { href: "/auth/activate", label: "Activate account" },
  { href: "/auth/register", label: "Register organization" },
];

const singleDashboard = (prefix: string, label: string): PortalNavItem[] => [
  { href: `${prefix}/dashboard`, label },
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
