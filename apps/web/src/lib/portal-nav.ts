import type { PortalIconName } from "@/components/portal/portal-icons";
import type { ModuleKey, ProductTier } from "@hrms/platform";

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

/** Longest-prefix wins. Unlisted routes are always visible. */
const NAV_MODULE_RULES = [
  { prefix: "/hr/organization/payroll-components", module: "payroll" },
  { prefix: "/hr/organization/statutory-rules", module: "payroll" },
  { prefix: "/hr/organization/pay-groups", module: "payroll" },
  { prefix: "/hr/integrations/bukucloud", module: "integrations" },
  { prefix: "/hr/integrations/api", module: "api" },
  { prefix: "/hr/employees/import", module: "import" },
  { prefix: "/employee/replacement-credit", module: "replacement" },
  { prefix: "/employee/overtime", module: "ot" },
  { prefix: "/employee/claims", module: "claims" },
  { prefix: "/employee/payslips", module: "payroll" },
  { prefix: "/employee/performance", module: "performance" },
  { prefix: "/employee/assets", module: "assets" },
  { prefix: "/manager/team-performance", module: "performance" },
  { prefix: "/hr/performance", module: "performance" },
  { prefix: "/hr/assets", module: "assets" },
  { prefix: "/hr/analytics", module: "analytics" },
  { prefix: "/hr/recruitment", module: "recruitment" },
  { prefix: "/hr/integrations", module: "integrations" },
  { prefix: "/hr/audit", module: "audit" },
  { prefix: "/hr/payroll", module: "payroll" },
  { prefix: "/director/analytics", module: "analytics" },
  { prefix: "/director/payroll", module: "payroll" },
] as const satisfies ReadonlyArray<{ prefix: string; module: ModuleKey }>;

const PRO_ONLY_NAV_PREFIXES = ["/hr/organization/leave-blackouts"];

export function moduleForNavHref(href: string): ModuleKey | null {
  const sorted = [...NAV_MODULE_RULES].sort((a, b) => b.prefix.length - a.prefix.length);
  const rule = sorted.find(
    (entry) => href === entry.prefix || href.startsWith(`${entry.prefix}/`),
  );
  return rule?.module ?? null;
}

function isNavHrefVisible(
  href: string,
  hasModule: (module: ModuleKey) => boolean,
  tier: ProductTier,
): boolean {
  if (PRO_ONLY_NAV_PREFIXES.some((prefix) => href === prefix || href.startsWith(`${prefix}/`))) {
    return tier !== "core";
  }
  const navModule = moduleForNavHref(href);
  if (!navModule) return true;
  return hasModule(navModule);
}

function filterNavItem(
  item: PortalNavItem,
  hasModule: (module: ModuleKey) => boolean,
  tier: ProductTier,
): PortalNavItem | null {
  const children = item.children
    ?.map((child) => filterNavItem(child, hasModule, tier))
    .filter((child): child is PortalNavItem => child !== null);

  const childList = children?.length ? children : item.children ? [] : undefined;
  const selfVisible = isNavHrefVisible(item.href, hasModule, tier);

  if (!selfVisible && !childList?.length) return null;

  // Hide grouping-only parents when every child is entitlement-filtered out.
  if (item.children?.length && childList?.length === 0) return null;

  return {
    ...item,
    children: childList,
  };
}

export function filterPortalNavSections(
  sections: PortalNavSection[],
  options: {
    hasModule: (module: ModuleKey) => boolean;
    tier: ProductTier;
  },
): PortalNavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => filterNavItem(item, options.hasModule, options.tier))
        .filter((item): item is PortalNavItem => item !== null),
    }))
    .filter((section) => section.items.length > 0);
}

export function getPortalNavSectionsForEntitlements(
  portal: string,
  options: {
    hasModule: (module: ModuleKey) => boolean;
    tier: ProductTier;
  },
): PortalNavSection[] {
  return filterPortalNavSections(getPortalNavSections(portal), options);
}

const employeeNav: PortalNavSection[] = [
  {
    items: [{ href: "/employee/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    label: "Time & leave",
    items: [
      { href: "/employee/leave", label: "Leave", icon: "leave" },
      { href: "/employee/attendance", label: "Attendance", icon: "attendance" },
      { href: "/employee/schedule", label: "My Schedule", icon: "timesheet" },
      { href: "/employee/manual-attendance", label: "Manual Attendance", icon: "manual-attendance" },
      { href: "/employee/report-late", label: "Report Late", icon: "report-late" },
      { href: "/employee/timesheet", label: "Timesheet", icon: "timesheet" },
      { href: "/employee/overtime", label: "Overtime", icon: "overtime" },
      { href: "/employee/replacement-credit", label: "Replacement Credit", icon: "replacement-credit" },
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
      { href: "/manager/team-leave", label: "Team Leave", icon: "team-leave" },
      { href: "/manager/team-attendance", label: "Team Attendance", icon: "team-attendance" },
      { href: "/manager/team-documents", label: "Team Documents", icon: "documents" },
      { href: "/manager/team-calendar", label: "Team Calendar", icon: "team-calendar" },
      { href: "/manager/team-performance", label: "Team Performance", icon: "team-performance" },
    ],
  },
];

/** HR Admin — grouped IA with collapsible submenus (profile lives in topbar). */
const hrNav: PortalNavSection[] = [
  {
    items: [
      { href: "/hr/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/hr/operations", label: "Operations", icon: "approvals" },
    ],
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
          { href: "/hr/employees/create", label: "Add employee", icon: "apply-behalf" },
          { href: "/hr/employees/import", label: "Bulk import", icon: "reports" },
        ],
      },
      { href: "/hr/apply-behalf", label: "Apply on behalf", icon: "apply-behalf" },
      {
        href: "/hr/organization",
        label: "Organization",
        icon: "organization",
        children: [
          { href: "/hr/organization", label: "Overview", icon: "organization" },
          { href: "/hr/organization/branches", label: "Branches", icon: "organization" },
          { href: "/hr/organization/departments", label: "Departments", icon: "team-performance" },
        ],
      },
    ],
  },
  {
    label: "Time & attendance",
    items: [
      { href: "/hr/leave", label: "Leave", icon: "leave" },
      { href: "/hr/attendance", label: "Attendance", icon: "attendance" },
      {
        href: "/hr/organization/shifts",
        label: "Schedules & policies",
        icon: "timesheet",
        children: [
          { href: "/hr/organization/shifts", label: "Shifts", icon: "attendance" },
          { href: "/hr/organization/rosters", label: "Rosters", icon: "timesheet" },
          { href: "/hr/organization/holidays", label: "Holidays", icon: "calendar" },
          { href: "/hr/organization/leave-types", label: "Leave types", icon: "leave" },
          { href: "/hr/organization/leave-blackouts", label: "Blackout periods", icon: "calendar" },
        ],
      },
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
    label: "Payroll & reports",
    items: [
      {
        href: "/hr/payroll",
        label: "Payroll",
        icon: "payroll",
        children: [
          { href: "/hr/payroll", label: "Pay runs", icon: "payroll" },
          { href: "/hr/payroll/new", label: "New pay run", icon: "payroll" },
          { href: "/hr/payroll/year-end", label: "Year-end", icon: "reports" },
          { href: "/hr/organization/pay-groups", label: "Pay groups", icon: "organization" },
          { href: "/hr/organization/payroll-components", label: "Components", icon: "payroll" },
          { href: "/hr/organization/statutory-rules", label: "Statutory rules", icon: "reports" },
        ],
      },
      { href: "/hr/reports", label: "Reports", icon: "reports" },
      { href: "/hr/audit", label: "Audit log", icon: "audit" },
    ],
  },
  {
    label: "Advanced",
    items: [
      { href: "/hr/recruitment", label: "Recruitment", icon: "employees" },
      { href: "/hr/analytics", label: "Analytics", icon: "reports" },
      {
        href: "/hr/integrations",
        label: "Integrations",
        icon: "organization",
        children: [
          { href: "/hr/integrations/webhooks", label: "Webhooks", icon: "organization" },
          { href: "/hr/integrations/api", label: "API keys", icon: "organization" },
          { href: "/hr/integrations/bukucloud", label: "BukuCloud", icon: "payroll" },
        ],
      },
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
            { href: "/director/analytics", label: "Analytics", icon: "reports" },
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
            { href: "/hr/analytics", label: "Analytics", icon: "reports" },
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
export function resolvePortalNavLabel(
  portal: string,
  pathname: string,
  sections?: PortalNavSection[],
): string | undefined {
  if (pathname.endsWith("/notifications")) {
    return "Notifications";
  }

  const navItems = sections
    ? sections.flatMap((section) => flattenNavItems(section.items))
    : getPortalNav(portal);

  const matches = navItems
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

export function getPortalIntegrationsHref(portal: string): string | undefined {
  if (portal === "HR Administrator") return "/hr/integrations";
  return undefined;
}
