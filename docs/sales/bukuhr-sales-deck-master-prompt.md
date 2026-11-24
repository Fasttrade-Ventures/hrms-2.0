# BukuHR sales deck — master prompt

Revise this file, then ask for a new PowerPoint from it. Anything under **Revise** is yours to change. Anything under **Product, as it is** is what the system actually does today. Do not turn a “do not claim” line into a slide unless you delete that line first.

The deck this replaces is `docs/sales/bukuhr-sales-deck.pptx`. It was too sparse, the type was too large, and it must not grow a price slide.

---

## Prompt

You are writing a client sales deck for BukuHR, an HR system. Build a widescreen PowerPoint, 13.333 by 7.5 inches, that a person can present. Speaker notes on every slide. No prices, no package cards, no “from RM” line, no yearly license, no setup fee.

### Revise — who it is for

The client is a company. The last briefing was an Australian company. Keep the language plain and specific. Do not say the product is in the middle of a country rollout. Do not name a competitor.

If this audience changes, replace this paragraph and the payroll rule below.

### Revise — what the deck should feel like

Fewer huge words. Smaller type is fine when the sentence earns it. One idea on a slide, but the idea can be a short group of real things, not a single noun floating in empty space.

This is a sales deck, not a one-minute opener and not a feature inventory. The opener already exists at `docs/sales/bukuhr-demo-opener.pptx`. Do not rebuild that. Tell the client what they can run, who uses it, and where a demo starts.

Visual: deep green `#1B3A28`, mid green `#2D5E3A`, cream `#F5F3EE`, Georgia for titles, Calibri for the rest. No stock photos, no icons-in-circles grid, no purple, no fake product screenshots, no real employee names, no pay figures. Shapes and type only.

### Revise — payroll on the slides

Say pay runs, payslips, and reports. The employee opens their own payslip.

Do not name EPF, SOCSO, EIS, PCB, EA, CP8D, HRDF, Lindung, zakat, Maybank, CIMB, or any other statutory scheme or bank file. Do not name tax, super, awards, STP, or another payroll product. Do not open statutory rules or year-end in the suggested demo.

### Product, as it is

BukuHR is one login for the employee, the manager, and HR. People, time, talent, and pay sit in the same system. HR creates the employee. The person sets a password from an activation email. There is also CSV bulk import.

**People**

- Directory, profile, address, emergency contact, employment, bank details, family
- Branches, departments, positions, manager line
- Documents the employee can open, and an HR document library
- Policies: HR publishes a PDF, staff acknowledge the current version, a new version asks them again
- Checklists when someone joins or leaves
- Letter templates with merge tags, used for offers and employment agreements
- Announcements, with an audience and a schedule
- Calendar, including public holidays set by HR

**Time**

- Leave: types, balances, half-day and multi-day, attachments, cancel and revoke, working days that skip weekends and holidays, HR can apply on behalf
- Professional time extras that exist: accrual, carry-forward, expiry, blackout dates
- Attendance: clock in and out, history, late report, manual attendance, timesheet
- Professional attendance extras that exist: rosters, shifts, overnight shifts, grace minutes, a workplace boundary on clock-in, tardiness alerts, auto clock-out
- Claims with a receipt, and a manager approval
- Overtime request and approval
- Replacement credit for work on a weekend or holiday, approved by the manager, then usable as leave
- Manager inbox for leave, attendance, claims, overtime, and replacement credit. One approver. Bulk approve exists.

**Talent**

- Recruitment: job requisitions, a candidate pipeline, an offer letter, the candidate accepts or rejects from a link, they can upload a signed agreement file, HR confirms hire into a draft employee and can start the onboarding checklist. This is an internal hiring desk.
- Performance: review cycles, templates, self-appraisal, manager rating, KPI rows on a review, up to five goals on a cycle
- Pulse: survey templates, a run, results, and a link an employee can answer
- Assets: a register, categories, assign and return, the employee sees what is on their name

**Pay and the record around it**

- Pay groups, pay components, a draft pay run, edit, submit, approve, lock
- Payslips
- Reports, including scheduled report email on the higher tier
- Analytics for workforce, leave, pay, and recruitment, filterable, with a detail drawer
- Audit log of who changed a record
- API keys, webhooks, and an outbound BukuCloud connection

**Who logs in**

- Employee: their own leave, time, documents, policies, payslip, assets, performance, pulse
- Manager: one inbox and their team
- HR: the organisation
- Branch admin: one or more sites
- Director: reports, analytics, and a payroll view, not the day-to-day inbox
- Owner: module settings. Do not make billing a slide.
- Auditor: audit log and reports

### Do not claim

These are not live. Leave them off the slides and out of the notes except as a warning not to promise them.

- More than one approver, escalation, or a workflow builder
- A public jobs page
- A native App Store or Play Store app
- E-signature inside the product. The candidate uploads a file they signed elsewhere.
- Single sign-on
- A learning system or training academy
- Mileage rates and a different overtime rate per employee
- WhatsApp, Bahasa, salary advance, zakat
- Face capture on clock-in
- Recognition, a benefits catalogue, shift swap, an org chart, birthday digests
- Pre-day-one onboarding
- Tax, super, or award calculation

### Revise — demo path

If they name the pain, open that. Otherwise the directory.

- Records: directory, then one person
- Leave: a request, then the manager inbox
- Rosters: the roster, then clock-in
- Reviews: a review cycle
- Hiring: a requisition and the pipeline
- Pay: a pay run, then a payslip. Nothing else in payroll.

### Output

Replace `docs/sales/bukuhr-sales-deck.pptx`. Keep the builder as `docs/sales/_build_sales_deck.py` so the file can be regenerated. Follow this prompt after it has been revised. If a revised line conflicts with **Do not claim**, stop and ask. Do not invent a module to fill a slide.
