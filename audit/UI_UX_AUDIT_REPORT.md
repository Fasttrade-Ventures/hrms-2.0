# BukuHR UI/UX audit

**Date:** 10 November 2026  
**Mode:** Read-only. No application source, styling, data, or configuration was changed.  
**Scope:** The BukuHR HRMS in this repository (`apps/web`, `packages/ui`), plus the local dev server at `http://localhost:3000`.  
**Primary evidence:** Route inventory (168 `page.tsx` templates), shared shells, design tokens, rendered authentication screens, and a read-only pass through the owner, HR admin, and employee portals on the local server. The connected organisation is pilot data for a Malaysia company, not a production tenant. No form was submitted.

This audit stops at recommendations. Nothing in this document is authorised for implementation.

---

## 1. Executive summary

BukuHR is a multi-portal HR and payroll system. The signed-in product is one application shell, a warm stone background, and a deep green brand. That identity is clear on the sign-in screen and in the shared sidebar.

The interface is not one design system. A small brand kit in `packages/ui` and `portal-*` components sits beside a shadcn / Base UI kit. Page titles, buttons, inputs, stat cards, and lists are implemented more than once, at different sizes. Australian organisations still meet Malaysian form labels and Malaysian bank-file choices in places the navigation has already learned to hide.

The highest-priority issues are broken or misleading navigation for non-employee roles, an employee phone menu that drops eight sidebar destinations, Australian payroll and employee-form leftovers, a sign-in checkbox that does not do what it says, and a muted text colour that fails WCAG 2.2 AA for normal text. A signed-in pass on 10 November 2026 confirmed the owner account-menu failure, the owner-to-HR analytics jump, the duplicate page titles, and the phone menu. This pilot organisation is Malaysia, so the Australian form and bank-file issues stay source findings.

The product does not need a new visual identity. The useful direction is to keep the current shell and brand, correct the role and country mismatches, and make the existing portal components the single source for titles, buttons, inputs, lists, and status.

| Metric | Result |
| --- | --- |
| Total modules discovered | 18 |
| Total page templates discovered | 168 |
| Pages visually reviewed | 15 |
| Pages not opened in the browser | 153 |
| Pages inaccessible | Owner profile and the owner bell return `/unauthorized`. The routes exist for an employee. |
| Total findings | 29 |
| Critical | 0 |
| High | 9 |
| Medium | 16 |
| Low | 4 |
| Confirmed findings | 28 |
| Suspected findings | 1 |

---

## 2. Product context

| Information | Finding |
| --- | --- |
| Product name | BukuHR. The npm workspace name is `hrms`. The document title is `BukuHR`. |
| Product category | HRMS with payroll, attendance, leave, claims, and approvals. |
| Business purpose | People operations for an organisation: directory, time, pay, documents, and approvals. |
| Target audience | Employer staff using a company workspace, not a public marketplace. |
| Primary users | Employees, managers, HR administrators. Branch admins, directors, owners, platform admins, and auditors have smaller portals. |
| User roles | `employee`, `manager`, `branch_admin`, `hr_administrator`, `director`, `organization_owner`, `platform_administrator` (`packages/domain/src/roles.ts`). Specialist permissions include payroll processor, payroll approver, recruiter, document custodian, asset manager, and auditor. Exporter and integration manager are catalogued and not wired. |
| Business model | Documented in `docs/pricing.md`: Core, Professional, and Enterprise. SaaS is Stripe in MYR. Standalone is invoiced. This running checkout is standalone: the sign-in screen has no organisation registration link. |
| Application type | Hybrid. One codebase supports a single-organisation standalone deployment and a multi-tenant SaaS mode. Entitlements hide modules by tier. |
| Deployment | Documented as Next.js, Supabase, and R2, with Vercel crons in `apps/web/vercel.json`. This audit ran the Next.js dev server locally against a remote Supabase project. |
| Product identity | Deep green `#2d5e3a` on warm stone `#f5f3ee`, white cards, Geist Sans, a square “B” mark. Documented design source is `pencil-new.pen` (`docs/ui-design-inventory.md`). |

### User groups

**Employee.** Self-service for leave, attendance, schedule, timesheet, claims, overtime, replacement credit, payslips, documents, policies, calendar, announcements, assets, performance, and pulse. Navigation is a grouped sidebar on large screens and a five-item bottom bar plus a More sheet on small screens. The More sheet does not list every sidebar destination (NAV-003).

**Manager.** Approves requests and reads team leave, attendance, documents, calendar, and performance. Bottom navigation exists and includes the sidebar destinations, with abbreviated labels.

**HR administrator.** Operates the organisation. The sidebar is grouped: People, Time & attendance, Workplace, Payroll & reports, Advanced. This is the dense portal, and the density matches the job. Profile lives in the top bar, which is consistent with the nav comment in `portal-nav.ts`.

**Branch admin.** Branch dashboard, employees, documents, calendar, apply-on-behalf, and reports. No bottom navigation. The account menu and notification bell point at employee routes (NAV-001).

**Director.** Analytics, reports, and payroll. `/director/dashboard` redirects to analytics. Same account-menu issue.

**Organisation owner.** Dashboard, a link into HR analytics, module settings, and billing when SaaS mode is on. Analytics changes the shell from Owner to HR Administrator (NAV-004).

**Platform administrator.** Deployment health and, in SaaS mode only, tenants. Standalone hides Tenants.

**Auditor.** Audit log in its own shell, plus a Reports link into `/hr/reports`. The HR layout does not admit the auditor permission, so that link resolves to `/unauthorized` for an auditor-only membership (NAV-002).

### Information architecture

Signed-in routes are role portals, not one shared sitemap. Middleware (`apps/web/src/lib/supabase/middleware.ts`) calls `canAccessPath`. Each portal has its own `layout.tsx` that mounts `PortalLayout` and thus `PortalShell`. HR is also open to `organization_owner` and to three specialist permissions. Module entitlements remove nav items. Australian organisations lose Year-end and Statutory rules from the nav (`MALAYSIA_ONLY_NAV_HREFS`).

There is no breadcrumb component anywhere in `apps/web/src`.

---

## 3. Application architecture

### Frontend

| Topic | What exists |
| --- | --- |
| Framework | Next.js App Router. The dev server reported Next.js 15.5.21. `apps/web/package.json` depends on `next` `^15.1.3` and React 19. |
| Routing | File routes under `apps/web/src/app`, with route groups `(auth)`, `(employee)`, `(manager)`, `(hr)`, `(branch-admin)`, `(director)`, `(owner)`, `(platform)`, `(auditor)`. |
| Layout | `AuthShell` for authentication. `PortalShell` for every signed-in portal: fixed 248px sidebar, 64px header, scrollable main. |
| State | Server components load data. Client components use React state and `useActionState` for forms. No global client store was found. |
| Forms | Server actions and Zod schemas in `@hrms/validation`. HR fields use `HrField`. Auth fields use `AuthTextField`. |
| UI libraries | `@hrms/ui` (9 components). shadcn “base-nova” on Base UI in `apps/web/src/components/ui` (button, input, card, dialog, badge, select, checkbox, label, separator, toggle). |
| Styling | Tailwind CSS 4. Tokens in `apps/web/src/app/globals.css`. |
| Icons | Custom `PortalIcon` set, plus `lucide-react` in a minority of screens. |
| Charts | No shared chart library. HR “Workforce today” is a set of CSS bars. shadcn chart tokens exist and are grayscale. |
| Type | Geist Sans and Geist Mono, loaded in `apps/web/src/app/layout.tsx`. |

### Backend context relevant to the UI

Supabase Auth. Roles and specialist permissions on organisation membership. Row-level organisation scope. Tier entitlements from `@hrms/platform`. Organisation `country` of `MY` or `AU` changes some payroll labels, statutory export options, and nav items. Currency display is `RM` or `A$` via `formatMoney` in `apps/web/src/lib/money.ts`.

### Shell geometry

From `apps/web/src/components/portal-shell.tsx`:

- Sidebar width `w-[248px]`, padding `px-4 py-6`, hidden off-canvas below the `lg` breakpoint (1024px).
- Header height `h-16`, horizontal padding `px-4 sm:px-8`.
- HR main padding is an inline `24px`. Other portals use `px-4 py-6 sm:px-6 lg:px-8`.
- Employee and manager main content gets extra bottom padding for the mobile tab bar. Other roles do not get a tab bar.
- The header always renders an `h1` from the nav label, except employee and manager below `lg`, where the header shows the brand instead of the title.

### Design tokens

`globals.css` defines a brand scale (`--accent-primary` `#2d5e3a`, stone surfaces, `--danger`, `--success`, `--warning`, radii 6/8/12/16, two shadows). The same file then defines shadcn tokens in neutral `oklch`. `.portal-theme` and `.auth-theme` remap shadcn `--primary` to the green accent. `@theme inline` redefines `--radius-sm` through `--radius-xl` from shadcn’s `--radius` (`0.625rem`), so the earlier 12px `--radius-lg` is not a stable token. `.dark` remaps shadcn colours, including a blue sidebar primary, and does not remap the brand greens. No theme toggle was found. Dark classes in components are latent.

---

## 4. Module inventory

| Module | Where it shows up | Notes |
| --- | --- | --- |
| Authentication | `/auth/*` | Login, forgot password, reset, activate, register, change password. Register is omitted from the UI when SaaS mode is off. |
| Employee workspace | `/employee/*` | 32 page templates. Self-service. |
| Manager workspace | `/manager/*` | 14 page templates. Approvals and team views. |
| Branch administration | `/branch-admin/*` | 14 page templates. |
| HR operations and people | `/hr/dashboard`, `/hr/operations`, `/hr/employees`, `/hr/checklists`, `/hr/apply-behalf` | Directory, create, import, dossier, apply on behalf. |
| Organisation catalogs | `/hr/organization/*` | Branches, departments, positions, shifts, rosters, holidays, leave types, claim types, blackouts, workflows, pay groups, components, statutory rules, asset categories. |
| Leave | `/hr/leave`, `/employee/leave`, manager team leave | HR queue, employee apply, audit. |
| Attendance | Employee attendance, schedule, timesheet, manual, late; `/hr/attendance` | Clock panel, history. |
| Payroll | `/hr/payroll`, `/employee/payslips`, `/director/payroll` | Pay runs, year-end, AU pay file. |
| Documents and policies | `/hr/documents`, `/hr/policies`, employee and manager document routes | Library, folders, required types, compliance. |
| Announcements and calendar | HR, employee, manager, branch calendar | |
| Assets | `/hr/assets`, `/employee/assets` | |
| Performance | `/hr/performance`, `/hr/pulse`, employee and manager performance | Templates, cycles, appraisals. |
| Recruitment | `/hr/recruitment` | Enterprise entitlement. |
| Reports and analytics | `/hr/reports`, `/hr/analytics`, director and branch reports | |
| Audit | `/hr/audit`, `/auditor/audit` | |
| Integrations | `/hr/integrations` | Webhooks, API, BukuCloud. |
| Owner | `/owner/dashboard`, `/owner/settings`, `/owner/billing` | Billing is SaaS-only in the nav. |
| Platform | `/platform/dashboard`, `/platform/tenants` | Tenants redirect away in standalone. |

---

## 5. Page inventory

168 route templates were discovered from `page.tsx` files. Dynamic record IDs are one template each, not one page per record.

| Review status | Count | Meaning |
| --- | --- | --- |
| Visually reviewed | 15 | Auth, owner, HR admin, employee, and the unauthorized screen. Listed in section 19. |
| Not opened | 153 | Route, portal shell, and nav placement are known. The page body was not rendered. |

The full table is in [page-inventory-table.md](page-inventory-table.md). Columns are page ID, module, page name, route, type, role, layout, and audit status.

Redirect templates, confirmed in source:

| Route | Behaviour |
| --- | --- |
| `/` | Signed-out users go to `/auth/login`. Signed-in users go to their portal home. |
| `/director/dashboard` | Redirects to `/director/analytics`. |
| `/hr/payroll/settings/components` | Redirects to `/hr/organization/payroll-components`. |
| `/hr/payroll/settings/pay-groups` | Redirects to `/hr/organization/pay-groups`. |
| `/hr/payroll/settings/statutory` | Redirects to `/hr/organization/statutory-rules`. |
| `/platform/tenants` | In standalone, the page redirects to `/platform/dashboard`. |

---

## 6. Visual design audit

### Layout

The signed-in shell is consistent: 248px sidebar, 64px header, one scroll region. That is worth keeping.

Page titles are not consistent.

- The shell paints an `h1` at `text-lg` (18px) from the nav label (`portal-shell.tsx` lines 144 and 161).
- `PortalPageHeader` paints another `h1` at 18px, then 28px from the `sm` breakpoint (`portal-primitives.tsx` lines 182–183). At least 94 route files render `PortalPageHeader` directly, and profiles and apply-on-behalf render it from shared components.
- The employee dashboard and leave page use a local `h1` at `text-2xl` (24px) instead.
- The employee directory uses an `h2` at `text-base` (16px), which is smaller than the shell title (`employee-list.tsx` line 135).
- The HR dashboard does not use `PortalPageHeader`. It uses a gradient hero `h2` (`hr-dashboard-hero.tsx`).
- The organisation hub uses an `h2` at `text-2xl` inside a shadcn card.

On a desktop HR page that uses `PortalPageHeader`, the user sees “Employees” in the header and a second, larger “Employees” in the page. On the employee dashboard the header says “Dashboard” and the page says “Good morning, {name}”.

HR content inset is 24px. Other portals use 16px, then 24px, then 32px horizontal padding. Section gaps vary between `space-y-3` (HR dashboard) and `space-y-6` (most other pages).

### Typography

| Role | Observed treatments |
| --- | --- |
| Auth title | 32px, 28px below `lg` |
| Shell title | 18px semibold |
| Portal page title | 18px, 28px from `sm` |
| Employee dashboard / leave title | 24px bold |
| Directory title | 16px semibold |
| Stat value | 32px Geist Mono in `StatCard`; 24px or 18px sans in `HrStatCards` |
| Section labels in the sidebar | 11px |
| Empty-state body | 11px |
| Auth body | 15px |
| HR field label | 13px |

There is no single type scale. Arbitrary sizes `11px`, `12px`, `13px`, and `15px` recur beside Tailwind steps.

### Colour

Brand meaning is clear when the brand tokens are used: green for primary and pending, `#067647` success, `#b54708` warning, `#b42318` danger, stone surfaces.

The same meanings are also drawn with Tailwind `emerald`, `amber`, `rose`, `red`, and `slate`, especially in badges, attendance chips, and the confirm dialog. The HR hero hard-codes `#2d5e3a`, `#234a2e`, `#1f4028`, and white.

`--foreground-muted` (`#7a8f7e`) is the colour for hints, sidebar group labels, and empty-state copy. Contrast against white is **3.47:1**. Against the stone page (`#f5f3ee`) it is **3.13:1**. Against the muted fill (`#e8e4db`) it is **2.73:1**. WCAG 2.2 AA for normal text is 4.5:1. Secondary text `#4a6b52` passes (5.97:1 on white). White on `#2d5e3a` passes (7.57:1). These ratios were calculated from the declared hex values, not from a screenshot meter.

### Spacing

A 4px grid is visible (`gap-2`, `gap-3`, `gap-4`, `py-6`) and then broken by one-off values: stat card padding `22`, icon chip `40`, HR shell padding `24`, auth brand panel `560px` with `px-14 py-16`, directory balance boxes `p-[10px] px-[12px]`.

### Hierarchy

Sign-in hierarchy is clear: mark, title, fields, one green button. That screen was rendered.

Inside the app, the shell title and the page title compete. Primary actions sit in different places: header-adjacent on some pages, inside `PortalPageHeader` actions, inside the directory toolbar, or inside the HR hero. The employee directory’s in-page title is quieter than the shell title, so the shell wins even though the directory filters are the working UI.

The HR gradient hero is a reasonable emphasis for a daily operations home. It should stay a dashboard treatment, not become the pattern for forms and lists.

---

## 7. Component consistency audit

| Category | Implementations | Shared source | Finding |
| --- | --- | --- | --- |
| Sidebar / header | 1 shell | `portal-shell.tsx` | Keep. Mobile behaviour differs by portal. |
| Bottom navigation | 2 | `employee-mobile-nav.tsx`, `manager-mobile-nav.tsx` | Employee More sheet is a different information architecture from the sidebar. |
| Breadcrumbs | 0 | — | Deep HR routes have only the shell title. |
| Primary button | 3 | Auth button `h-10` brand fill; shadcn `Button` default `h-8`; raw links `h-10` with `text-xs` | CMP-001 |
| Secondary / ghost | 2 | Auth ghost `h-10`; shadcn `outline` `h-8` | Same finding. |
| Destructive | 2 | shadcn `destructive` tint; confirm dialog `bg-red-600` | Confirm dialog does not use `--danger`. |
| Text input | 4 | `AuthTextField` `h-10`; password field `h-10` white; `HrTextInput` `h-10` over shadcn; shadcn `Input` `h-8`; AU pay file raw `h-8` | CMP-002, VIS-004 |
| Select | 2 | `HrSelect` `h-10`; shadcn `Select` | Native selects and Base UI selects both appear. |
| Checkbox | 2 | Auth 18px accent; HR native `size-4 accent-primary` | Labels are associated. |
| Status | 3+ | `StatusPill`, shadcn `Badge`, local amber/emerald/rose chips | CMP-004 |
| Lists | 4 | `ListCard` flex rows; `PayrunListTable` copy of that pattern; `HrTableCard` CSS grid; HTML `<table>` in reports, audit, billing, announcements | CMP-003 |
| Stat blocks | 2 | `StatCard` (32px mono, 22px pad, icon chip); `HrStatCards` (shadcn card, 24px sans, no icon) | VIS-002 |
| Cards | 2 | Token border + `--shadow-card`; shadcn card with a ring and no brand shadow | Part of the two stacks. |
| Dialogs | 2 | `ConfirmDialog` in `@hrms/ui`; shadcn `Dialog` | ACC-005 for the custom dialog. |
| Empty states | 1 | `EmptyState` | Used widely. Keep. |
| Toasts | 1 | `@hrms/ui` toast provider | Not exercised in the browser. |
| Icons | 2 | `PortalIcon`, `lucide-react` | CMP-005 |

`ListCard` is used on about 22 screens. `StatusPill` on about 30. `StatCard` on the dashboards. shadcn `Button` is imported by about 70 files. Both stacks are load-bearing. Standardising means choosing the portal sizes and colours and implementing them once, not deleting the screens that use shadcn.

---

## 8. UX audit

### Navigation

The HR sidebar grouping matches the work: people, time, workplace, payroll, advanced. Entitlement and country filters are the right mechanism. Active items use a green tint. They do not set `aria-current`.

Failures:

- Branch admin, director, owner, platform admin, and auditor account menus open `/employee/profile` and `/employee/profile/security`. The notification bell opens `/employee/notifications` unless the portal is Manager or HR (`portal-shell.tsx` lines 27–30, `portal-nav.ts` lines 499–509). Middleware only allows `/employee` for the `employee` role.
- Auditor → Reports opens `/hr/reports`. The HR layout allows HR admin, owner, recruiter, document custodian, and asset manager. It does not allow `auditor`. `requireRoleOrPermission` redirects to `/unauthorized` (`(hr)/layout.tsx`, `session.ts` lines 115–127). The reports access helper would have allowed the auditor. The layout gate is stricter than the route helper.
- Owner → Analytics opens `/hr/analytics` and therefore the HR shell. The owner sidebar disappears.
- Employee phone navigation omits My Schedule, Manual Attendance, Report Late, Timesheet, Policies, My assets, Performance, and Pulse.

### Signed-in check, 10 November 2026

The local server was already running at `http://localhost:3000`. The pilot workspace has no separate admin login. The organisation owner account is also the HR administrator, so the HR portal is the admin view. A second account was used for the employee portal. Sessions were opened for inspection only. Enable, Disable, Save company, Create payrun, Submit leave, Clock in, and Delete were not used.

| Portal | What rendered | Result |
| --- | --- | --- |
| Owner | `/owner/dashboard`, `/owner/settings` | Home greeting is hardcoded “Good evening, Owner”. Module rows have Enable and Disable as immediate submits. Settings already edits country, tier, duty segregation, and modules. Sidebar is Dashboard, Analytics, Module settings. |
| Owner → employee routes | `/employee/notifications`, `/employee/profile` | Both land on `/unauthorized?from=…`. The owner bell and account menu do not open. |
| Owner → Analytics | `/hr/analytics` | The sidebar switches to the full HR nav. Two `h1` elements both read “Analytics”. |
| HR admin | `/hr/dashboard`, `/hr/employees`, `/hr/organization`, `/hr/payroll`, `/hr/employees/create` | HR home greets the person by first name. Directory, organisation hub, and the Malaysia payroll list render. Create employee is titled “Add employee” in the shell and “Create employee” on the page. NRIC, race, religion, EPF, and spouse “IC no” are present, which matches this Malaysia company. |
| Employee | `/employee/dashboard`, `/employee/leave`, `/employee/attendance`, `/employee/payslips` | Home greets by first name. Leave, attendance, and an empty payslips page render. Clock in and Submit leave were not used. |
| Employee phone, 390×844 | Dashboard and the More sheet | Bottom bar is Home, Leave, Attend, Pay, More. The sheet shows Dashboard, Announcements, Calendar, Claims, Documents, and Profile. Overtime and Replacement are in the component but hidden because those modules are off for this person. The eight sidebar gaps are still absent. No horizontal overflow. |

### Forms

Auth labels are wired with `htmlFor`. HR fields use `HrField` and `Label`. Required fields use the `required` attribute. There is no shared required-marker or unsaved-changes pattern in the shared form components that were read.

The sign-in checkbox “Keep me signed in on this device” is checked by default. The sentence under it says the preference is recorded for a future idle timeout and that cookies use the Supabase refresh flow today (`login-form.tsx` lines 73–82). That sentence was visible at 390×844. It is an engineering note on the front door, and the control does not change the session.

Email fields on sign-in and forgot-password pass `muted`, which sets the background to `#e8e4db`. The password field stays white. Both are 40px tall. Computed styles at a wide viewport: email `rgb(232, 228, 219)`, password `rgb(255, 255, 255)`. The email field looks disabled. It is not.

Australian create and edit employee forms hide NRIC and EPF, and they show TFN, BSB, and super. They still show Race and Religion with Malaysian option lists, and spouse and child fields labelled “IC no” (`create-employee-form.tsx` around lines 290–310 and 438–473; the same labels in `edit-employee-form.tsx`). The TFN input is a plain text field.

### Lists

The employee directory has search, status and branch filters, pagination, an empty state, and a row that stacks below `md`. Column headers are `hidden` below `md`, so a phone row has no field labels (`employee-list.tsx` lines 164–166).

`ListCard` and the pay-run list repeat a flex-row pattern with a horizontal scroll container. They are not `<table>` elements, so column headers are not programmatically tied to cells.

### Detail

Employee and HR profile screens use tab sets and `StatusPill`. Pay-run detail is a long operations page: lines, exports, payouts, workflow actions. That density fits payroll. The export panel is the problem, not the density.

### Feedback

`EmptyState` and `ConfirmDialog` exist and are used for destructive HR actions (delete employee, delete pay run). The confirm dialog has `role="dialog"`, `aria-modal`, and Escape. It does not move focus into the dialog or trap focus. That behaviour was not keyboard-tested.

Success and error copy on auth screens uses `AuthError`. Form pending labels switch to “Signing in…” and “Sending…”.

### Workflows that were not executed

Leave apply, clock-in, claim submit, approval, pay-run generate, billing checkout, and employee create were not run. They would write data or call external services. The notes below come from reading the forms.

| Workflow | Start | Gap found without submitting |
| --- | --- | --- |
| Sign in | `/auth/login` | Checkbox copy; muted email field; Malaysia-only brand sentence in standalone. |
| Reset password | `/auth/forgot-password` | Same muted email. Back control is a button inside a link. Not submitted, so the “reset link sent” state was not seen. |
| Create employee, this Malaysia company | `/hr/employees/create` | Opened and not saved. NRIC, race, religion, EPF, and spouse “IC no” are on the form. That is correct for Malaysia. The Australian path, which still shows race, religion, and “IC no”, was not rendered. |
| Pay-run export, AU | `/hr/payroll/[payrunId]` | Format menu always includes Maybank and CIMB. Statutory options are correctly empty for AU. A separate AU pay-file form exists on the payroll hub and uses plainer inputs. |

---

## 9. Responsive design audit

Target viewports from the brief, and what was actually measured on the auth shell.

| Viewport | Requested | Measured | Auth result |
| --- | --- | --- | --- |
| Mobile | 390 × 844 | 390 × 844 | Visually reviewed. No horizontal overflow (`scrollWidth` 390). Brand panel `display: none`. Sign-in and forgot-password screenshots saved. |
| Tablet | 768 × 1024 | 768 × 1024 | Measured, not screenshotted. No horizontal overflow. Brand panel hidden, because `lg` starts at 1024px. |
| Laptop | 1280 × 800 | 1600 × 1000 after emulation | Brand panel visible, 560px. Main column 1040px. The extra width is the inspection browser’s device scale, not a page overflow. |
| Standard desktop | 1440 × 900 | 1800 × 1125 after emulation | Same split. Aside 560px, main 1240px on the earlier 1800px measurement. |
| Large desktop | 1920 × 1080 | Not separately measured | The auth brand column is a fixed 560px, so a wider window only grows the form column. |

Signed-in pages were opened at the wide inspection size (reported `innerWidth` 1800) and again at 390×844 for the employee home, the employee More sheet, and the HR directory. None of those three phone screens set `scrollWidth` above 390. HR at 390 uses the menu button and has no bottom bar. The directory header row computed `display: none`. The sidebar account block was off-canvas (`getBoundingClientRect().right` was 0).

From source, and now checked where noted:

- Below 1024px the sidebar is off-canvas. Employee and manager also get a bottom bar. HR, branch admin, director, owner, platform, and auditor only get a menu button.
- `ListCard` and the pay-run list set `overflow-x-auto` and a minimum content width, so wide rows scroll sideways instead of stacking.
- The employee directory grid is `md:grid`. Below 768px it becomes a stacked row and hides the header. That avoids a crushed table and removes the labels (RES-001).
- The auth form column is `max-w-[420px]` with large empty space underneath on a tall phone. That is acceptable for a short form.

Screenshots:

- [Sign in, 390 × 844](evidence/login-mobile-390.png)
- [Forgot password, 390 × 844](evidence/forgot-password-mobile-390.png)
- [Owner dashboard](evidence/owner-dashboard-1440.png), [owner settings](evidence/owner-settings.png), [HR dashboard](evidence/hr-dashboard.png), [directory](evidence/hr-employees.png), [directory at 390](evidence/hr-employees-390.png), [organisation](evidence/hr-organization.png), [payroll](evidence/hr-payroll.png), [create employee](evidence/hr-create-employee.png), [analytics](evidence/hr-analytics.png)
- [Employee dashboard](evidence/employee-dashboard.png), [dashboard at 390](evidence/employee-dashboard-390.png), [More sheet](evidence/employee-more-390.png), [leave](evidence/employee-leave.png), [attendance](evidence/employee-attendance.png), [payslips](evidence/employee-payslips.png)
- `evidence/login-wide.png` is a cropped capture of the green brand panel. The geometry above is the reliable wide-layout evidence. Do not read the crop as a broken form. The signed-in captures include pilot names and work email addresses. They are evidence files, not for publication.

---

## 10. Accessibility audit

Reference: WCAG 2.2 AA. This is not a conformance claim. Assistive technology was not used. Keyboard order inside the signed-in app was not tested.

| Check | Result |
| --- | --- |
| Contrast of muted text | Fails AA for normal text at the declared `#7a8f7e` pairings. ACC-001. High confidence in the arithmetic. |
| Contrast of primary green, secondary green, danger, warning | Pass AA against their declared backgrounds. |
| Form labels on auth and `HrField` | Labels are associated. |
| Sign-in heading | One `h1` (“Sign in”). Brand headline is an `h2`. |
| Signed-in headings | Shell `h1` plus page `h1` on `PortalPageHeader` screens. |
| Skip link | None found. |
| `aria-current` on nav | None found. |
| Landmarks | Auth and portal mains exist. Sidebar is a `nav` without an accessible name. |
| Language | `<html lang="en">`. The UI copy that was read is English. |
| Status not by colour alone | `StatusPill` and `Badge` include text. Workforce bars include a text label and a percent. |
| Nested interactive control | Forgot-password “Back to sign in” is an `AuthGhostButton` inside a `Link`. The accessibility tree exposed both a link and a button with that name. |
| Dialog | `ConfirmDialog` exposes `role="dialog"` and Escape. Focus trap and initial focus were not found in the component and were not tested. |
| Non-semantic lists | `ListCard` and `PayrunListTable` are div rows. |
| Touch size | Sign-in button is 40px tall. Auth checkbox is 18px, with a text label that expands the hit area. Bottom-nav icons are 20px inside a padded link. Not measured against 24px in the browser. |

---

## 11. Technical audit

The visual drift has a structural cause.

1. `packages/ui` was built to match the Pencil frames (`StatCard`, `ListCard`, `StatusPill`, `EmptyState`).
2. Later HR screens adopted shadcn (`HrStatCards`, `HrTableCard`, `Badge`, `Button`, `Card`).
3. Auth kept its own inputs and buttons.
4. `globals.css` holds both token sets, and Tailwind’s `@theme` rewrites the radius variables the brand components read.

`PayrunListTable` repeats `ListCard`’s markup instead of calling it (`payrun-list-table.tsx`). That is a local fork, not a different product need.

Country behaviour is split the same way. Nav filtering and statutory export options know about Australia. The bank-format `<select>` does not. Demographic fields on the employee form do not.

Inline style is used for values that should be tokens: `StatCard` padding 22 and `fontSize: 32`, HR main padding 24, the dashboard hero gradient.

---

## 12. Design system assessment

| Area | Current state |
| --- | --- |
| Colour | Brand scale is defined and used by the shell. shadcn neutrals and Tailwind palette colours are also used for the same statuses. |
| Typography | Geist is consistent. The size scale is not. |
| Spacing | Tailwind steps plus inline 22, 24, 32, 40. |
| Components | Two stacks. Portal shell is the one shared layout. |
| Layout | One shell, three title patterns, two content insets. |
| Responsive | Sidebar collapses at 1024px. Bottom nav for two roles only. |
| Interaction | Brand hover is `--accent-hover`. shadcn focus uses a ring. Auth inputs change border colour only. |
| Documentation | `docs/ui-design-inventory.md` tracks Pencil frames. It is not a token or component spec, and it still marks branch admin, director, and owner as undesigned even though those routes now render the shared shell. |

---

## 13. Findings register

### NAV-001

| Field | Value |
| --- | --- |
| Category | Navigation |
| Module | Branch admin, Director, Owner, Platform, Auditor |
| Page | Account menu, notification bell |
| Route | Header links to `/employee/profile`, `/employee/profile/security`, `/employee/notifications` |
| Component | `PortalShell`, `getPortalProfileHref`, `getPortalSettingsHref` |
| Current behaviour | For every portal other than Manager and HR, profile, settings, and the bell use employee routes. Manager and HR have their own profile and notification routes. |
| Issue | Middleware allows `/employee` only for the `employee` role. A membership without that role is sent away from the account menu and the bell. |
| Expected experience | Each portal opens profile, password, and notifications inside a route that role is allowed to visit. |
| Evidence | `portal-nav.ts` lines 499–509. `portal-shell.tsx` lines 27–30. Rendered on the owner shell: the bell target is `/employee/notifications`, and both that URL and `/employee/profile` finish at `/unauthorized?from=…`. The same account can open `/hr/*` because it is also the HR administrator. |
| Impact | Password, profile, and notifications can be unreachable from the shell for branch admins, directors, owners, platform admins, and auditors. |
| Root cause | Helpers default to the employee portal. |
| Recommendation | Point each portal at its own profile and inbox, or at a shared account route that every signed-in role may open. |
| Priority | High |
| Confidence | High |

### NAV-002

| Field | Value |
| --- | --- |
| Category | Navigation |
| Module | Auditor |
| Page | Reports link in the auditor sidebar |
| Route | `/hr/reports` |
| Component | Auditor nav, HR layout |
| Current behaviour | The auditor nav includes `/hr/reports`. The HR layout allows HR administrator, organisation owner, recruiter, document custodian, and asset manager. |
| Issue | An auditor-only membership fails `requireRoleOrPermission` and is redirected to `/unauthorized`, even though `canAccessReports` would allow an auditor. |
| Expected experience | The Reports item opens a report screen the auditor is allowed to use, in the auditor shell. |
| Evidence | `portal-nav.ts` lines 444–451. `(hr)/layout.tsx` lines 6–10. `session.ts` lines 115–127. `lib/reports/access.ts` lines 6–11. |
| Impact | The second item in the auditor portal does not open for the role that portal is built for. |
| Root cause | The layout allow-list and the reports access helper disagree. |
| Recommendation | Admit `auditor` on the reports segment only, or move the auditor report entry under `/auditor`. |
| Priority | High |
| Confidence | High |

### NAV-003

| Field | Value |
| --- | --- |
| Category | Navigation |
| Module | Employee |
| Page | Mobile tab bar and More sheet |
| Route | `/employee/*` below 1024px |
| Component | `EmployeeMobileNav` |
| Current behaviour | The tab bar is Home, Leave, Attend, Pay, More. More lists Dashboard, Announcements, Calendar, Claims, Overtime, Documents, Replacement, and Profile. |
| Issue | My Schedule, Manual Attendance, Report Late, Timesheet, Policies, My assets, Performance, and Pulse are in the sidebar and absent from the phone menu. |
| Expected experience | Every sidebar destination is reachable on a phone without typing a URL. |
| Evidence | `employee-mobile-nav.tsx` lines 12–28. `portal-nav.ts` lines 204–239. Rendered at 390×844: the sheet shows Dashboard, Announcements, Calendar, Claims, Documents, and Profile. Overtime and Replacement are filtered out for this employee. Schedule, manual attendance, report late, timesheet, policies, assets, performance, and pulse are not in the sheet. |
| Impact | Phone employees cannot discover schedule, timesheet, late reports, policies, assets, performance, or pulse. |
| Root cause | The More list was not kept in step with the sidebar. |
| Recommendation | Drive the phone menu from the same nav config as the sidebar. Manager bottom nav already covers its sidebar destinations; its labels are abbreviated (“Team Attend”, “Team Perf.”) and can stay until the shared config exists. |
| Priority | High |
| Confidence | High |

### NAV-004

| Field | Value |
| --- | --- |
| Category | Navigation |
| Module | Owner |
| Page | Analytics item |
| Route | `/hr/analytics` from the owner nav |
| Component | Owner nav, HR layout |
| Current behaviour | Owner is allowed into the HR layout. Opening Analytics replaces the owner sidebar with the HR sidebar. |
| Issue | The owner loses the Owner navigation, including Settings and Billing, without an explicit portal switch. |
| Expected experience | Analytics opens with a visible way back to the owner shell, or it is rendered inside the owner shell. |
| Evidence | `portal-nav.ts` lines 422–433. Rendered: the owner Analytics item is `href="/hr/analytics"`. After navigation the sidebar is the HR sidebar (Dashboard, Operations, Employees, and the rest), and both headings read “Analytics”. |
| Impact | Owners can think they have left their account area. |
| Root cause | A cross-portal href. |
| Recommendation | Host the owner analytics view under `/owner`, or label the jump and keep an owner return path in the header. |
| Priority | Medium |
| Confidence | High |

### NAV-005

| Field | Value |
| --- | --- |
| Category | Navigation |
| Module | All signed-in portals |
| Page | Detail and edit templates |
| Route | Example: `/hr/employees/[employeeId]/edit` |
| Component | None |
| Current behaviour | Orientation is the shell title, resolved by the longest matching nav href. |
| Issue | There is no breadcrumb. Nested screens keep an ancestor label such as “Directory” or “Employees” and do not show the record name in the shell. |
| Expected experience | Detail and edit screens show the trail back to the list, using the record name. |
| Evidence | Repository search for `breadcrumb` in `apps/web/src` returned no matches. `resolvePortalNavLabel` in `portal-nav.ts`. |
| Impact | HR users on long record pages have a weak sense of place. |
| Root cause | Never built. |
| Recommendation | Add one breadcrumb pattern for detail, edit, and create routes. Do not add breadcrumbs to dashboards. |
| Priority | Medium |
| Confidence | High |

### UX-001

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Authentication |
| Page | Sign in |
| Route | `/auth/login` |
| Component | `LoginForm` |
| Current behaviour | “Keep me signed in on this device” is checked by default. Under it: “Preference is recorded for future idle-timeout settings; session cookies use the standard Supabase refresh flow today.” |
| Issue | The label promises a session choice. The helper says the choice is not wired, and it names the auth vendor. |
| Expected experience | Either the checkbox changes session length, or it is not shown. Helper text stays in product language. |
| Evidence | `login-form.tsx` lines 73–82. Visible on the 390×844 screenshot. |
| Impact | Every person who signs in reads an unfinished control. |
| Root cause | A placeholder preference shipped in the form. |
| Recommendation | Remove the checkbox and the helper until the idle timeout exists. |
| Priority | High |
| Confidence | High |

### UX-002

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | HR people |
| Page | Create employee, edit employee |
| Route | `/hr/employees/create`, `/hr/employees/[employeeId]/edit` |
| Component | `create-employee-form.tsx`, `edit-employee-form.tsx` |
| Current behaviour | For Australia, NRIC and EPF blocks are omitted. Race, Religion, spouse “IC no”, and child “IC no” still render. Race and religion use Malaysian option lists. |
| Issue | An Australian employee record is collected with Malaysian demographic and identity fields. |
| Expected experience | Australian forms ask for the identity fields Australia uses, and omit IC, race, and religion unless the organisation has a stated reason to store them. |
| Evidence | `create-employee-form.tsx` lines 259–263 (NRIC hidden), 290–310 (race and religion shown), 438–473 (IC labels). Matching labels in `edit-employee-form.tsx`. |
| Impact | HR enters data that does not belong on an Australian file, and the form feels like the Malaysian product. |
| Root cause | Country branching was applied to statutory fields and not to the personal and family sections. |
| Recommendation | Gate those fields on country the same way NRIC is gated. |
| Priority | High |
| Confidence | High |

### UX-003

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Payroll |
| Page | Pay-run exports |
| Route | `/hr/payroll/[payrunId]` |
| Component | `PayrunExportPanel` |
| Current behaviour | The bank format menu always offers Bank CSV, Maybank, and CIMB. Statutory options are correctly withheld when the country is AU. The payroll hub shows a separate AU pay-file form for Xero and MYOB. |
| Issue | An Australian pay run still offers Malaysian bank formats. The Australian download is a second form with different inputs. |
| Expected experience | The export control offers the files that country can produce, in one form pattern. |
| Evidence | `payrun-export-panel.tsx` lines 53–57. `export-options.ts` `statutoryExportOptionsFor` and `showAuPayFile`. `au-pay-file-form.tsx`. |
| Impact | Payroll staff can generate a file format that does not match the organisation’s banks. |
| Root cause | Bank formats were not passed through the country switch that statutory formats use. |
| Recommendation | Filter bank formats by country and present the Australian pay file in the same export panel. |
| Priority | High |
| Confidence | High |

### UX-004

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Authentication |
| Page | Sign in |
| Route | `/auth/login` |
| Component | `LoginPage` brand panel |
| Current behaviour | Standalone brand copy includes “Malaysia payroll with statutory compliance”. The rendered sign-in screen is standalone. |
| Issue | The brand panel describes one country. The product now operates for Australia as well. |
| Expected experience | The sentence matches the deployment, or it stays country-neutral. |
| Evidence | `login/page.tsx` lines 9–16. Accessibility tree on the rendered page included that list item. The panel is visible from the `lg` breakpoint. |
| Impact | Australian customers meet the wrong compliance promise before they sign in. |
| Root cause | Brand copy was written for the Malaysian product. |
| Recommendation | Use a country-neutral line, or choose the line from the organisation once a country is known. Before sign-in, neutral copy is the honest option. |
| Priority | Medium |
| Confidence | High |

### UX-005

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Shell |
| Page | Header date |
| Route | All signed-in routes |
| Component | `PortalShell` |
| Current behaviour | The header date is formatted with `en-MY`. |
| Issue | Australian organisations still get a Malaysian locale for the weekday, even though the numeric date is day/month/year in both countries. |
| Expected experience | The locale follows the organisation country. |
| Evidence | `portal-shell.tsx` line 75. The same `en-MY` pattern appears in attendance, payslips, and reports. |
| Impact | Small. English weekday names are similar. It is a sign the shell is still Malaysia-shaped. |
| Root cause | Locale was hard-coded. |
| Recommendation | Pass the organisation locale into the shell formatter when the country work is done. |
| Priority | Low |
| Confidence | High |

### UX-006

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | HR people |
| Page | Australian employee fields |
| Route | Create and edit employee |
| Component | `AuEmployeeFields` |
| Current behaviour | Tax File Number is a normal text input. |
| Issue | The TFN is visible while the form is open and can be copied from the field. |
| Expected experience | The value is masked by default, with an explicit reveal for the HR user who must check it. |
| Evidence | `au-employee-fields.tsx` lines 42–49. No `type="password"` or mask. |
| Impact | Shoulder-surfing and screen-share exposure of a government identifier. |
| Root cause | The field was built as an ordinary required input. |
| Recommendation | Mask it, and keep it off payslips and list screens. |
| Priority | Low |
| Confidence | Medium. The unmasked field is confirmed. Exposure in other screens was not fully searched. |

### VIS-001

| Field | Value |
| --- | --- |
| Category | Visual |
| Module | All signed-in portals |
| Page | Any page with `PortalPageHeader`, plus employee dashboard and leave |
| Route | Widespread. Examples: `/hr/payroll`, `/employee/dashboard`, `/employee/leave`, `/hr/employees` |
| Component | `PortalShell`, `PortalPageHeader`, local headings |
| Current behaviour | The shell renders an 18px `h1`. `PortalPageHeader` renders a second `h1` that becomes 28px. Employee dashboard and leave render a 24px `h1`. The directory renders a 16px `h2`. |
| Issue | The same job, naming the page, uses three sizes and often two `h1` elements. |
| Expected experience | One page title. The shell carries it, or the page carries it, not both. |
| Evidence | `portal-shell.tsx` lines 144 and 161. `portal-primitives.tsx` lines 182–183. Rendered headings included “Dashboard” plus “Good evening, Owner”; “Payroll” plus “Payroll”; “Add employee” plus “Create employee”; “Module settings” plus “Module settings”; “Leave” plus “Apply Leave”; “Attendance” plus “Attendance”. The HR home uses one `h1` (“Dashboard”) and an `h2` for the greeting, which is the cleaner of the two patterns. |
| Impact | Pages feel like they were headed twice. Heading structure is noisy for assistive tech. |
| Root cause | The shell title and the Pencil page header were both implemented. |
| Recommendation | Keep the shell title for simple pages. Use `PortalPageHeader` only when the page needs a description and actions, and make that heading an `h2` or remove the shell `h1`. |
| Priority | High |
| Confidence | High |

### VIS-002

| Field | Value |
| --- | --- |
| Category | Visual |
| Module | Dashboards and HR directory |
| Page | Employee, HR, manager, branch, owner, and platform dashboards versus the employee directory and organisation hub |
| Route | `/employee/dashboard`, `/hr/dashboard`, `/hr/employees`, `/hr/organization` |
| Component | `StatCard`, `HrStatCards` |
| Current behaviour | `StatCard` is a 32px mono number, 22px padding, and a 40px icon chip. `HrStatCards` is a shadcn card with a 24px sans number and no icon. |
| Issue | The same “metric card” pattern has two visual languages. |
| Expected experience | One stat component, with an optional icon. |
| Evidence | `packages/ui/src/stat-card.tsx`. `apps/web/src/components/hr/hr-ui.tsx` lines 6–44. |
| Impact | HR screens that mix both, or that sit next to dashboards, look like different products. |
| Root cause | Directory screens were built with shadcn after the Pencil stat card. |
| Recommendation | Use `StatCard` for both, or retoken `HrStatCards` to the same type and padding. |
| Priority | Medium |
| Confidence | High |

### VIS-004

| Field | Value |
| --- | --- |
| Category | Visual |
| Module | Authentication |
| Page | Sign in, forgot password |
| Route | `/auth/login`, `/auth/forgot-password` |
| Component | `AuthTextField` with `muted` |
| Current behaviour | Email uses the muted surface `#e8e4db`. Password uses white. Both are editable and 40px tall. |
| Issue | The email field looks disabled. Placeholder contrast on that fill is weaker still (muted text on muted fill is 2.73:1). |
| Expected experience | Editable fields share one fill. |
| Evidence | `login-form.tsx` lines 53–61. `auth-primitives.tsx` lines 103–105. Computed style email `rgb(232, 228, 219)`, password `rgb(255, 255, 255)`. Screenshots at 390×844. |
| Impact | People hesitate before typing the first field on the product. |
| Root cause | `muted` was applied to a writable field. The prop is also the read-only treatment. |
| Recommendation | Reserve `muted` for read-only values. |
| Priority | High |
| Confidence | High |

### CMP-001

| Field | Value |
| --- | --- |
| Category | Component |
| Module | Auth, HR, employee |
| Page | Forms and toolbars |
| Route | Widespread |
| Component | `AuthPrimaryButton`, shadcn `Button`, raw anchor buttons |
| Current behaviour | Auth buttons are 40px, 15px type, 6px radius, brand green. shadcn default buttons are 32px. Employee dashboard “Apply Leave” is a 40px link with 12px type. |
| Issue | Primary actions do not share height, type size, or radius. |
| Expected experience | One primary, one secondary, one destructive, at one height. |
| Evidence | `auth-primitives.tsx` lines 43–55. `components/ui/button.tsx` sizes `h-8` and `h-9`. `employee/dashboard/page.tsx` lines 233–237. |
| Impact | Toolbars look uneven when a shadcn button sits near a portal link. |
| Root cause | Three authors, three buttons. |
| Recommendation | Keep the 40px brand button as the product button. Map shadcn variants onto it. |
| Priority | Medium |
| Confidence | High |

### CMP-002

| Field | Value |
| --- | --- |
| Category | Component |
| Module | Auth, HR, payroll |
| Page | Forms |
| Route | Auth forms, HR forms, `/hr/payroll` AU pay file |
| Component | `AuthTextField`, `HrTextInput`, shadcn `Input`, raw `<input>` |
| Current behaviour | Auth and HR text inputs are 40px. shadcn `Input` is 32px. The AU pay-file inputs are raw 32px fields with a generic border (`au-pay-file-form.tsx` lines 23–25). |
| Issue | Form controls do not share height or chrome. |
| Expected experience | One text input, one select, one date input. |
| Evidence | `auth-primitives.tsx` line 103. `form-fields.tsx` lines 31–36. `components/ui/input.tsx` line 12. `au-pay-file-form.tsx`. |
| Impact | Payroll and HR forms feel assembled from different kits. |
| Root cause | shadcn’s default height was left at 32px while the Pencil forms are 40px. |
| Recommendation | Set the shared input height to 40px and use it in the AU pay-file form. |
| Priority | Medium |
| Confidence | High |

### CMP-003

| Field | Value |
| --- | --- |
| Category | Component |
| Module | Lists across HR, employee, manager, platform |
| Page | Directories, pay runs, reports |
| Route | Examples: `/employee/claims`, `/hr/payroll`, `/hr/employees`, `/hr/reports/[slug]` |
| Component | `ListCard`, `PayrunListTable`, `HrTableCard`, HTML tables |
| Current behaviour | Four list structures. `PayrunListTable` duplicates `ListCard` rather than using it. |
| Issue | Row height, header style, and mobile behaviour differ by module. |
| Expected experience | One list for simple operational queues. HTML tables remain appropriate for print reports and dense payroll lines. |
| Evidence | `packages/ui/src/list-card.tsx`. `payrun-list-table.tsx`. `hr-ui.tsx` `HrTableCard`. `<table>` in `report-runner.tsx`, `announcement-table.tsx`, and others. |
| Impact | Learning one list does not teach the next module. |
| Root cause | New screens copied markup or switched to CSS grid. |
| Recommendation | Make pay runs use `ListCard`. Keep a real table for print and for the payroll line editor. Document which to use. |
| Priority | Medium |
| Confidence | High |

### CMP-004

| Field | Value |
| --- | --- |
| Category | Component |
| Module | HR, attendance, approvals |
| Page | Directory, attendance, approval queue |
| Route | `/hr/employees`, `/employee/attendance`, `/manager/approvals` |
| Component | `StatusPill`, `Badge`, local chips |
| Current behaviour | `StatusPill` is a 24px brand or emerald/amber/rose pill. `Badge` is 20px with a similar emerald/rose palette plus shadcn variants. Attendance and approvals add further one-off pills, including 10px uppercase chips. |
| Issue | Status is recognisable, and the chrome is not shared. |
| Expected experience | One pill, with tones for success, warning, danger, and pending. |
| Evidence | `packages/ui/src/status-pill.tsx`. `components/ui/badge.tsx`. Local chips in `employee/attendance/page.tsx` and `manager-approvals-view.tsx`. |
| Impact | Status colour still communicates. The extra variants make the system look unfinished. |
| Root cause | Badge was introduced for the directory while `StatusPill` remained on dashboards. |
| Recommendation | Map directory statuses to `StatusPill`. |
| Priority | Medium |
| Confidence | High |

### CMP-005

| Field | Value |
| --- | --- |
| Category | Component |
| Module | Notifications, attendance, a few dialogs |
| Page | Those screens |
| Route | `/employee/notifications` and others |
| Component | `PortalIcon`, `lucide-react` |
| Current behaviour | The shell uses a custom icon set. Notifications and some attendance controls import Lucide. |
| Issue | Stroke and size differ slightly. |
| Expected experience | One icon set in the product UI. |
| Evidence | `notifications-list.tsx` imports Lucide. Shell uses `PortalIcon`. |
| Impact | Low. Both sets are simple line icons. |
| Root cause | Lucide arrived with shadcn. |
| Recommendation | Prefer `PortalIcon` in product screens. Leave Lucide inside shadcn primitives if those primitives need it. |
| Priority | Low |
| Confidence | High |

### RES-001

| Field | Value |
| --- | --- |
| Category | Responsive |
| Module | HR people, branch employees |
| Page | Employee directory |
| Route | `/hr/employees`, `/branch-admin/employees` |
| Component | `EmployeeList` |
| Current behaviour | From 768px up, a CSS grid shows column headers. Below that, headers are `hidden` and each person becomes a stacked block. |
| Issue | Stacked rows do not label job title, branch, joined date, login, or status. |
| Expected experience | Each stacked value has a visible label. |
| Evidence | `employee-list.tsx` lines 24–25 and 164–175. Rendered at 390×844 on `/hr/employees`: the header row computed `display: none`, `scrollWidth` stayed 390, and each person is a stacked card without field labels. At the wide viewport the Role, Employee, Job title, Branch / Dept, Joined, Login, Status, and Action headers are visible. |
| Impact | Phone and small-tablet HR use is harder to scan. |
| Root cause | The header was hidden to avoid a crushed grid, and labels were not added to the stacked cells. |
| Recommendation | Add a short label per stacked field under the `md` breakpoint. |
| Priority | Medium |
| Confidence | High for the source. The rendered phone layout was seen at 390×844. |

### RES-002

| Field | Value |
| --- | --- |
| Category | Responsive |
| Module | HR and the smaller admin portals |
| Page | All pages in those portals |
| Route | `/hr/*` and the admin portals below 1024px |
| Component | `PortalShell` |
| Current behaviour | Only employee and manager render a bottom nav. Other roles open the full sidebar from a menu button. |
| Issue | HR has the longest nav. On a phone it is a single scrolling drawer. |
| Expected experience | Confirm with HR users whether the drawer is acceptable. A bottom bar that duplicates the HR sidebar would not fit. |
| Evidence | `portal-shell.tsx` lines 152–159 and 196–197. Rendered at 390×844 on `/hr/employees`: a menu button, the page title, no bottom bar, and no horizontal overflow. The drawer itself was not opened. |
| Impact | The directory is usable on a phone. The long HR list is one tap away in the drawer. Whether HR staff work on phones is still a product question, not a layout failure. |
| Root cause | Bottom nav was designed for the two self-service portals. |
| Recommendation | Leave the drawer. Revisit only if HR staff actually work on phones. |
| Priority | Low |
| Confidence | Medium. The phone layout was seen. Whether HR wants a bottom bar is still open. |

### ACC-001

| Field | Value |
| --- | --- |
| Category | Accessibility |
| Module | Shell, empty states, hints |
| Page | Any screen using `--foreground-muted` at body size |
| Route | Widespread |
| Component | Token `--foreground-muted` |
| Current behaviour | `#7a8f7e` on white is 3.47:1. On `#f5f3ee` it is 3.13:1. On `#e8e4db` it is 2.73:1. It is used at 11px, 12px, and 13px. |
| Issue | Normal text in this colour does not meet WCAG 2.2 AA (4.5:1). Large text would need 3:1, and 11px text is not large text. |
| Expected experience | Hint text meets 4.5:1 on the surface it sits on. |
| Evidence | `globals.css` lines 21 and 81. Contrast calculated from those hex values. Usage examples: `empty-state.tsx` line 25, sidebar group labels in `portal-shell.tsx` line 109. |
| Impact | Secondary instructions and empty-state copy are harder to read, including for low vision. |
| Root cause | The muted green is too close to the stone background. |
| Recommendation | Darken the muted token until it clears 4.5:1 on white and on `#f5f3ee`. Re-check the muted-fill case. |
| Priority | High |
| Confidence | High for the token maths. A pixel sample from a screenshot was not taken. |

### ACC-002

| Field | Value |
| --- | --- |
| Category | Accessibility |
| Module | Shell |
| Page | All signed-in pages |
| Route | All portal routes |
| Component | `PortalShell`, nav links |
| Current behaviour | No skip link. Nav links do not set `aria-current`. The sidebar `nav` has no accessible name. |
| Issue | Keyboard users start in the sidebar on every page. Screen-reader users get an unnamed navigation and no current-page state beyond visual weight. |
| Expected experience | A skip link to main. `aria-current="page"` on the active item. A name on the nav. |
| Evidence | Search for `aria-current` and “skip” in `apps/web/src` returned no matches. `portal-shell.tsx` line 105. |
| Impact | Extra tabbing, and a weaker current-page announcement. |
| Root cause | The shell was styled without those attributes. |
| Recommendation | Add the three attributes on the existing shell. Do not redesign the nav. |
| Priority | Medium |
| Confidence | High for the missing attributes. Screen-reader behaviour was not tested. |

### ACC-003

| Field | Value |
| --- | --- |
| Category | Accessibility |
| Module | Authentication |
| Page | Forgot password |
| Route | `/auth/forgot-password` |
| Component | `ForgotPasswordForm` |
| Current behaviour | A `Link` wraps `AuthGhostButton`, which renders a `<button>`. |
| Issue | Interactive content is nested. The accessibility tree showed a link and a button, both named “Back to sign in”. |
| Expected experience | One link or one button. |
| Evidence | `forgot-password-form.tsx` lines 80–82. Rendered accessibility snapshot at 390×844. |
| Impact | Duplicate control in the tab order and in screen-reader lists. |
| Root cause | A button component was used for a navigation action. |
| Recommendation | Style the link as the ghost button, without a nested button. |
| Priority | Medium |
| Confidence | High |

### ACC-004

| Field | Value |
| --- | --- |
| Category | Accessibility |
| Module | Lists using `ListCard` and the pay-run list |
| Page | Those lists |
| Route | Examples: `/employee/payslips`, `/hr/payroll` |
| Component | `ListCard`, `PayrunListTable` |
| Current behaviour | Headers and cells are divs in a flex row. |
| Issue | There is no row/column relationship for assistive technology. |
| Expected experience | A real table, or an explicit list where each card is self-describing. |
| Evidence | `list-card.tsx` lines 41–64. `payrun-list-table.tsx` lines 18–30. |
| Impact | Table navigation commands do not work on these lists. |
| Root cause | The Pencil list was built as a flex layout. |
| Recommendation | Use `<table>` when the layout is columnar. Keep cards when each row is a self-contained summary. |
| Priority | Medium |
| Confidence | High for the markup. Assistive technology was not used. |

### ACC-005

| Field | Value |
| --- | --- |
| Category | Accessibility |
| Module | Destructive confirms |
| Page | Delete employee, delete pay run, and other confirmations |
| Route | Those actions |
| Component | `ConfirmDialog` |
| Current behaviour | The dialog sets `role="dialog"`, `aria-modal`, and `aria-labelledby`, and Escape closes it. No focus move or focus trap was found in the component. |
| Issue | Keyboard focus can remain on the page behind the dialog. |
| Expected experience | Focus moves to the dialog, stays inside it, and returns to the trigger on close. |
| Evidence | `packages/ui/src/confirm-dialog.tsx` lines 28–38 and 75–88. |
| Impact | A keyboard user can activate the page behind a destructive confirm. |
| Root cause | The dialog was hand-built rather than taken from the shadcn dialog, which has focus management. |
| Recommendation | Confirm with a keyboard pass, then use one dialog primitive. |
| Priority | Medium |
| Confidence | Low. The missing code is confirmed. The failure was not executed. |

### TEC-001

| Field | Value |
| --- | --- |
| Category | Technical |
| Module | Design tokens and component stacks |
| Page | Global |
| Route | — |
| Component | `globals.css`, `packages/ui`, `components/ui` |
| Current behaviour | Brand CSS variables and shadcn `oklch` tokens coexist. `@theme` redefines radius variables. `.dark` does not retoken the brand greens. Chart tokens are gray. Components hard-code 22px padding, 32px type, and 24px shell padding. |
| Issue | There is no single token layer for colour, type, radius, or control height. |
| Expected experience | One set of tokens, consumed by both the portal components and the shadcn theme. |
| Evidence | `globals.css` lines 10–68 and 117–158. `stat-card.tsx` lines 23 and 36. `portal-shell.tsx` line 190. |
| Impact | Every new screen can pick either stack and look slightly different. |
| Root cause | shadcn was added beside an existing Pencil-based kit. |
| Recommendation | Point shadcn `--primary`, radius, and input height at the brand tokens. Stop adding a third local style. |
| Priority | Medium |
| Confidence | High |

### UX-007

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Owner |
| Page | Owner dashboard |
| Route | `/owner/dashboard` |
| Component | Owner dashboard page |
| Current behaviour | The page title is `${greetingForHour(hour)}, Owner`. The card under the module table says dedicated owner settings screens have not shipped, and links to Module settings. |
| Issue | The owner home does not use the signed-in person’s name, and it describes settings as unshipped while `/owner/settings` already edits country, state, product tier, payroll duty segregation, and module flags. HR and employee homes greet by first name. |
| Expected experience | The greeting uses the same first-name helper as the other portals. The card describes the settings screen that exists. |
| Evidence | Rendered title “Good evening, Owner”. `owner/dashboard/page.tsx` line 25 and lines 80–82. `firstNameFromFullName` in `lib/employees/self.ts` lines 233–238. `/owner/settings` rendered with country, tier, and module controls. |
| Impact | The owner home looks unfinished next to the HR and employee homes, and it points at work that is already on the next screen. |
| Root cause | The owner title was a placeholder, and the card copy was not updated when Module settings shipped. |
| Recommendation | Greet with `firstNameFromFullName`. Replace the “until dedicated owner settings screens ship” sentence with a description of `/owner/settings`. |
| Priority | Medium |
| Confidence | High |

### UX-008

| Field | Value |
| --- | --- |
| Category | User experience |
| Module | Owner |
| Page | Owner dashboard and module settings |
| Route | `/owner/dashboard`, `/owner/settings` |
| Component | `updateModuleFlagFormAction` forms |
| Current behaviour | Each module row submits Enable or Disable immediately. Payroll duty segregation does the same. There is no confirm step. |
| Issue | One click turns a module off for the organisation. Delete employee and delete pay run already use `ConfirmDialog`. These toggles do not. |
| Expected experience | Disabling a module, or enabling duty segregation, asks for confirmation and names the consequence. |
| Evidence | Rendered Enable and Disable controls on both owner screens. `owner/dashboard/page.tsx` lines 62–71. `owner/settings/page.tsx` lines 45–50. The buttons were not pressed. |
| Impact | An accidental Disable on payroll, documents, or leave changes the product for every role. |
| Root cause | The entitlement form was shipped as a bare submit. |
| Recommendation | Use the existing confirm dialog for Disable, and for any toggle that changes who can approve pay. |
| Priority | Medium |
| Confidence | High |

---

## 14. Severity analysis

| Priority | Count | IDs |
| --- | --- | --- |
| Critical | 0 | — |
| High | 9 | NAV-001, NAV-002, NAV-003, UX-001, UX-002, UX-003, VIS-001, VIS-004, ACC-001 |
| Medium | 16 | NAV-004, NAV-005, UX-004, UX-007, UX-008, VIS-002, CMP-001, CMP-002, CMP-003, CMP-004, RES-001, ACC-002, ACC-003, ACC-004, ACC-005, TEC-001 |
| Low | 4 | UX-005, UX-006, CMP-005, RES-002 |

| Category | High | Medium | Low |
| --- | --- | --- | --- |
| Navigation | 3 | 2 | 0 |
| User experience | 3 | 3 | 2 |
| Visual | 2 | 1 | 0 |
| Component | 0 | 4 | 1 |
| Responsive | 0 | 1 | 1 |
| Accessibility | 1 | 4 | 0 |
| Technical | 0 | 1 | 0 |

Confirmed: 28. Suspected: ACC-005 only (dialog focus was not keyboard-tested). RES-002 was seen at 390×844: HR has a menu button, no bottom bar, and no horizontal overflow. Whether HR wants a bottom bar stays a product question.

---

## 15. Areas to retain

- The green-on-stone identity, the “B” mark, and Geist. Sign-in at 390px is calm and aligned. White on `#2d5e3a` passes contrast.
- `PortalShell` as the only application frame: 248px sidebar, grouped HR navigation, entitlement filtering, and the Australia nav filter for year-end and statutory rules.
- `EmptyState` and the directory’s search, filters, pagination, and empty copy.
- Country-aware pieces that already work: NRIC and EPF hidden for Australia, `A$` salary labels, statutory export options withheld for Australia, separate AU holiday loading.
- The HR dashboard’s denser rhythm and hero. A payroll and operations home should stay information-dense. Do not flatten it to match the employee dashboard.
- HTML tables for print reports. Those should not be forced into `ListCard`.
- Director dashboard redirecting to analytics. A separate empty dashboard would not help.

---

## 16. Recommended improvement roadmap

Do not start this roadmap until an option in section 17 is chosen.

1. Fix the role gates: NAV-001 and NAV-002. These are behaviour bugs in the shell.
2. Fix country mismatches: UX-002 and UX-003.
3. Remove the sign-in checkbox note and the muted email fill: UX-001 and VIS-004.
4. Repair the employee phone menu from the same nav source: NAV-003.
5. Darken `--foreground-muted`: ACC-001.
6. Decide the single title rule: VIS-001.
7. Then unify button, input, stat, list, and status on the existing portal components.

---

## 17. Improvement strategy options

No option below is authorised.

### Option A — UI consistency correction

1. Scope. Typography, spacing, colour usage, buttons, inputs, tables, cards, and dialogs. Page structure and features stay.
2. Outcome. One control size and one status language, on the current shell.
3. Affected modules. Every portal, because the shell and the two kits are shared. Highest file count is HR.
4. Technical complexity. Medium. The risk is visual regression across 168 templates, not new business logic.
5. Dependencies. A short token decision: 40px controls, brand green, one radius, one muted colour that passes contrast.
6. Risks. Screens that intentionally use shadcn density, especially the employee directory, will move. Payroll line tables should be left as tables.
7. Sequence. Tokens, button and input, stat and status, lists, title rule.
8. Effort. Large.

### Option B — UX improvement

1. Scope. Role navigation, phone menu, Australian forms and bank formats, sign-in copy, directory labels on small screens, breadcrumbs on detail pages.
2. Outcome. Each role can open the destinations its nav advertises, and Australian HR stops seeing Malaysian identity fields and bank formats.
3. Affected modules. Shell, employee mobile nav, auditor, owner, employee create/edit, pay-run export, directory.
4. Technical complexity. Medium. Some items are routing and conditional fields, not a restyle.
5. Dependencies. A decision on where auditor reports and owner analytics live.
6. Risks. Changing role gates can open a page the role should not see. The safer change is to point links at routes the role already passes.
7. Sequence. NAV-001, NAV-002, UX-002, UX-003, NAV-003, UX-008, UX-007, UX-001, RES-001.
8. Effort. Medium.

### Option C — Master design system

1. Scope. Document and implement the tokens and components the product already has. Do not invent a second visual language.
2. Outcome. shadcn tokens alias the brand tokens. `packages/ui` is the product layer. New screens stop inventing a third button.
3. Affected modules. `globals.css`, `packages/ui`, `components/ui`, then callers over time.
4. Technical complexity. Medium to large.
5. Dependencies. Option A’s size and colour decisions.
6. Risks. A full token migration that also turns on `.dark` would fight the brand, because the dark block is a neutral shadcn theme. Leave dark mode off until it is designed.
7. Sequence. Write the token map, alias shadcn, replace forks such as `PayrunListTable`, then document when to use a list versus a table.
8. Effort. Large.

### Option D — Full standardisation

1. Scope. Options A, B, and C, plus the accessibility items ACC-002 through ACC-005 and the responsive directory labels.
2. Outcome. The current product, consistent and usable for the roles and countries it already supports.
3. Affected modules. All of them, in stages.
4. Technical complexity. Large.
5. Dependencies. Product decisions for auditor reports, owner analytics, and whether HR is expected to work on a phone.
6. Risks. A big-bang visual rewrite. Stage it behind the behaviour fixes.
7. Sequence. Behaviour (B), contrast and sign-in (small A), tokens (C), component sweep (A), accessibility and breadcrumbs.
8. Effort. Very large.

---

## 18. Decision table

| Decision area | Finding | Recommendation |
| --- | --- | --- |
| Current design system | A real brand kit exists and is only half adopted. | Improve it. Do not replace the identity. |
| Layout consistency | One shell. Three title patterns and two content insets. | Mandatory: one title. Optional: one inset. |
| Component library | Portal kit plus shadcn, plus local forks. | Mandatory for new work: one button, input, and status. Sweep existing screens in Option A. |
| Typography | Geist is settled. Sizes are not. | Keep Geist. Standardise the title and the 11–15px extras after contrast is fixed. |
| Colour system | Brand greens work. Muted text fails AA. Status also uses emerald, amber, and rose. | Mandatory: darken muted text. Optional: map status colours onto the brand tokens. |
| Navigation | HR grouping is sound. Several role links leave the portal or hit a layout wall. The employee phone menu is incomplete. | Mandatory: NAV-001, NAV-002, NAV-003. |
| UX workflows | Sign-in and Australian HR forms disagree with the product’s own country and session behaviour. | Mandatory: UX-001, UX-002, UX-003. |
| Responsive design | Auth, the employee home, and the HR directory hold at 390 with no horizontal scroll. Directory labels disappear under 768px. HR has no bottom bar. | Mandatory: RES-001. RES-002 can wait on an HR decision. |
| Accessibility | Muted contrast fails. Skip link and current-page state are absent. One nested button was seen. Dialog focus is untested. | Mandatory: ACC-001. The rest are the next accessibility pass, not a redesign. |
| Technical architecture | Two token systems and a radius override. | Alias shadcn to the brand tokens. Do not add another UI kit. |

Mandatory means the evidence shows a broken task, a false control, a country mismatch, or an AA contrast failure. Everything else is optional consistency work.

---

## 19. Audit coverage and limitations

| Limit | Detail |
| --- | --- |
| Visually reviewed | 15 routes: `/auth/login`, `/auth/forgot-password`, `/owner/dashboard`, `/owner/settings`, `/hr/dashboard`, `/hr/employees`, `/hr/organization`, `/hr/payroll`, `/hr/employees/create`, `/hr/analytics`, `/employee/dashboard`, `/employee/leave`, `/employee/attendance`, `/employee/payslips`, `/unauthorized`. |
| Viewports actually measured | 390×844 on auth, the employee home, the More sheet, and the HR directory. 768×1024 on auth only. Wide signed-in pages reported `innerWidth` 1800 after a 1440 request. 1920×1080 was not measured. |
| Authenticated UI | Opened read-only against the pilot organisation. There is no separate admin user: the owner account is also the HR administrator. One employee account was used for the employee portal. Names and work emails are visible in the evidence screenshots and are not repeated here. |
| Workflows not run | Sign-in submit, password reset submit, leave submit, attendance clock, claims, approvals, payroll generation, module Enable/Disable, Save company, billing, imports, and deletes. |
| Roles not exercised | Manager, branch admin, director, auditor, and platform admin. Their findings stay on nav config, layouts, and `canAccessPath`. |
| Assistive technology | Not used. |
| Contrast | Calculated from declared hex, not sampled off a screenshot. |
| Page bodies | Shared shells, nav, and the forms cited in the findings were read in source. 153 templates were not opened. Pattern findings still apply where those pages use `PortalShell`. |
| Pencil file | `docs/ui-design-inventory.md` was read. The `.pen` file was not opened. |
| This document | Audit output only. Application files were not modified. |

### Final assessment

BukuHR already has a recognisable product. The shell, the green, and the HR information architecture should stay.

The signed-in pass agrees. The owner shell, the HR shell, and the employee shell are the same product, with the title and stat inconsistencies called out above. The owner bell and profile are actual dead ends, not only a code reading. Australian leftovers were not on screen because this pilot company is Malaysia.

The evidence says the next decision is a correction pass, not a new design. Role links and Australian leftovers are product bugs. The muted email field and the sign-in checkbox are front-door defects. The two UI kits explain the rest of the inconsistency, and they can be reconciled by making the existing portal components the standard.

Recommended sequence if work is authorised later: Option B first, the contrast and sign-in pieces of Option A second, then Option C only as far as aliasing tokens. Option D is the full programme, and it should be staged so payroll screens and the HR dashboard keep their density.

Stop here.
