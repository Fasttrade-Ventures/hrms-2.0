import type { PortalIconName } from "@/components/portal/portal-icons";

export type PortalNavItem = {
  href: string;
  label: string;
  icon: PortalIconName;
  children?: PortalNavItem[];
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
      { href: "/employee/schedule", label: "My schedule", icon: "timesheet" },
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
    label: "Workplace",
    items: [
      { href: "/manager/announcements", label: "Announcements", icon: "announcements" },
    ],
  },
  {
    label: "My team",
    items: [
      { href: "/manager/team-leave", label: "Team leave", icon: "team-leave" },
      { href: "/manager/team-attendance", label: "Team attendance", icon: "team-attendance" },
      { href: "/manager/team-documents", label: "Team documents", icon: "documents" },
      { href: "/manager/team-calendar", label: "Team calendar", icon: "team-calendar" },
      { href: "/manager/team-performance", label: "Team performance", icon: "team-performance" },
    ],
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
      {
        href: "/hr/employees",
        label: "Employees",
        icon: "employees",
        children: [
          { href: "/hr/employees", label: "Directory", icon: "employees" },
          { href: "/hr/employees/create", label: "Create employee", icon: "apply-behalf" },
        ],
      },
      {
        href: "/hr/organization",
        label: "Organization",
        icon: "organization",
        children: [
          { href: "/hr/organization", label: "Overview", icon: "organization" },
          { href: "/hr/organization/branches", label: "Branches", icon: "organization" },
          { href: "/hr/organization/departments", label: "Departments", icon: "team-performance" },
          { href: "/hr/organization/shifts", label: "Shifts", icon: "attendance" },
          { href: "/hr/organization/rosters", label: "Rosters", icon: "timesheet" },
          { href: "/hr/organization/holidays", label: "Holidays", icon: "calendar" },
          { href: "/hr/organization/leave-types", label: "Leave types", icon: "leave" },
          { href: "/hr/organization/pay-groups", label: "Pay groups", icon: "payroll" },
          { href: "/hr/organization/payroll-components", label: "Payroll components", icon: "payroll" },
          { href: "/hr/organization/statutory-rules", label: "Statutory rules", icon: "reports" },
        ],
      },
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
          { href: "/hr/performance", label: "Performance", icon: "performance" },
        ],
  },
  {
    label: "Finance & compliance",
    items: [
      { href: "/hr/reports", label: "Reports", icon: "reports" },
      {
        href: "/hr/payroll",
        label: "Payroll",
        icon: "payroll",
        children: [
          { href: "/hr/payroll", label: "Pay runs", icon: "payroll" },
          { href: "/hr/payroll/new", label: "New payrun", icon: "payroll" },
          { href: "/hr/payroll/year-end", label: "Year-end", icon: "reports" },
          { href: "/hr/integrations/bukucloud", label: "BukuCloud", icon: "organization" },
        ],
      },
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
      return [
        {
          items: [
            { href: "/branch-admin/dashboard", label: "Dashboard", icon: "dashboard" },
            { href: "/branch-admin/employees", label: "Employees", icon: "employees" },
            { href: "/hr/documents", label: "Documents", icon: "documents" },
            { href: "/hr/calendar", label: "Calendar", icon: "calendar" },
          ],
        },
      ];
    case "Director":
      return [
        {
          items: [
            { href: "/director/dashboard", label: "Dashboard", icon: "dashboard" },
            { href: "/director/reports", label: "Reports", icon: "reports" },
            { href: "/director/payroll", label: "Payroll", icon: "payroll" },
          ],
        },
      ];
    case "Organization Owner":
      return [
        {
          items: [
            { href: "/owner/dashboard", label: "Dashboard", icon: "dashboard" },
            { href: "/owner/settings", label: "Module settings", icon: "organization" },
            { href: "/hr/payroll", label: "Payroll", icon: "payroll" },
            { href: "/hr/reports", label: "Reports", icon: "reports" },
            { href: "/hr/audit", label: "Audit", icon: "audit" },
          ],
        },
      ];
    case "Platform Admin":
      return [
        {
          items: [
            { href: "/platform/dashboard", label: "Dashboard", icon: "dashboard" },
            { href: "/platform/tenants", label: "Tenants", icon: "organization" },
          ],
        },
      ];
    case "Auditor":
      return [
        {
          items: [
            { href: "/auditor/audit", label: "Audit log", icon: "audit" },
            { href: "/hr/reports", label: "Reports", icon: "reports" },
          ],
        },
      ];
    default:
      return [];
  }
}

function flattenNavItems(items: PortalNavItem[]): PortalNavItem[] {
  return items.flatMap((item) => {
    const self = [{ href: item.href, label: item.label, icon: item.icon }];
    return item.children?.length ? [...self, ...flattenNavItems(item.children)] : self;
  });
}

/** Flat list for active-path / page-title lookups (includes nested children). */
export function getPortalNav(portal: string): PortalNavItem[] {
  return getPortalNavSections(portal).flatMap((section) => flattenNavItems(section.items));
}

/** Prefer the most specific (longest) matching href for page titles. */
export function resolvePortalNavLabel(portal: string, pathname: string): string | undefined {
  const matches = getPortalNav(portal)
    .filter((item) => {
      if (pathname === item.href) return true;
      if (item.href.endsWith("/dashboard")) return pathname === item.href;
      return pathname.startsWith(`${item.href}/`);
    })
    .sort((a, b) => b.href.length - a.href.length);

  return matches[0]?.label;
}

export function getPortalLabel(portal: string): string {
  return portal;
}

export function getPortalProfileHref(portal: string): string {
  if (portal === "Manager") return "/manager/profile";
  if (portal === "HR Administrator") return "/hr/profile";
  if (portal === "Auditor") return "/employee/profile";
  return "/employee/profile";
}

export function getPortalSettingsHref(portal: string): string {
  if (portal === "Manager") return "/manager/profile/security";
  if (portal === "HR Administrator") return "/hr/profile/security";
  return "/employee/profile/security";
}
