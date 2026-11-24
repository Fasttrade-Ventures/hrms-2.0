# Hirix HR sales deck — master prompt

**How to use:** Copy everything inside the fenced `PROMPT` block below. Paste into ChatGPT, DeepSeek, Claude, or Gamma. Ask it to output a PowerPoint / Google Slides outline with speaker notes, or to generate the deck in Gamma / Beautiful.ai.

**Brand rule for this deck only:** Present the product as **Hirix HR**. Do not say BukuHR, HIRIX.ai admin, or internal repo names on slides. The underlying product is the same HR system.

---

## PROMPT

```
You are a senior B2B product marketer and presentation designer.

Create a client sales deck for **Hirix HR**, a modern cloud HR system for companies that need one place for people, time, talent, and pay.

OUTPUT FORMAT (pick what the user asked for; default = both):
1) A slide-by-slide outline (title + 3–6 bullets + speaker notes for every slide)
2) Ready-to-build structure for widescreen 16:9 PowerPoint / Google Slides / Gamma

CONSTRAINTS
- Widescreen 16:9 (13.333 × 7.5 in if PowerPoint)
- Speaker notes on every slide
- NO prices, NO package cards, NO “from RM”, NO yearly license, NO setup fee, NO SST
- NO competitor names
- NO fake screenshots of real products, NO stock photo grids, NO purple theme, NO icon-circle feature walls
- NO real employee names, NO sample pay figures
- Do not invent modules. Only use capabilities listed under PRODUCT TRUTH below
- Do not put anything from DO NOT CLAIM on slides or notes as a promise
- Language: plain, confident, specific. Not hype. Not “AI-powered everything.”
- One idea per slide is preferred; a short group of concrete capabilities is OK

BRAND (deck-only name)
- Product name on every title/logo mention: **Hirix HR**
- Tagline options (use one consistently): “HR that runs with your team” OR “People, time, talent, and pay — one login”
- Visual direction: deep forest green #1B3A28, mid green #2D5E3A, cream #F5F3EE, white cards, soft borders
- Titles: Georgia or similar serif; body: Calibri / Inter / system sans
- Shapes + type only (no photography)

AUDIENCE
- Primary: company founders, COOs, HR leads evaluating an HR system for Malaysia (and/or regional ops)
- Tone: professional sales meeting, ~10–15 minutes before a live product demo
- If the audience is Australia-focused, keep payroll language generic (“pay runs, payslips, reports”) and do not name MY statutory schemes

SLIDE ARC (12–16 slides; do not pad beyond 16)
1. Title — Hirix HR + one-line promise
2. The problem — fragmented leave / attendance / approvals / pay / records
3. The answer — one login for Employee, Manager, HR
4. Who uses it — three roles in one system (Employee / Manager / HR); mention Branch Admin & Director briefly in notes only if needed
5. People & organisation — directory, branches, departments, manager line, documents, policies, announcements, calendar
6. Time & attendance — leave, clock in/out, timesheet / attendance matrix, claims, overtime (where entitled)
7. Approvals that move — manager inbox; leave, claims, attendance, overtime; visibility for the manager’s team
8. Talent — performance reviews + KPIs; recruitment pipeline + offer letter (enterprise-style capability — present as available capability, not a price tier)
9. Pay & records — pay runs, payslips the employee can open, reports, audit trail
10. Day in the life — short journey: hire → activate → request leave → manager approves → payslip
11. Why Hirix HR — 4–5 proof points (single system, role portals, Malaysia-ready ops language if MY audience, live product not slideware, manager + HR + employee)
12. Demo path — where we start in the live system
13. Next step — book / continue demo / pilot conversation (no price)

Optional (only if needed, keep under 16 total):
- Security & control (roles, audit log, private files) as one short slide
- Close / thank you with contact placeholder

PRODUCT TRUTH (what Hirix HR actually does — use this; do not invent)

Hirix HR is one login for the employee, the manager, and HR. People, time, talent, and pay sit in the same system. HR creates the employee. The person sets a password from an activation email. CSV bulk import exists.

People
- Directory, profile, address, emergency contact, employment, bank details, family/dependents
- Branches, departments, positions, reporting manager
- Employee documents + HR document library; compliance status for managers’ teams
- Policies: HR publishes PDF; staff acknowledge; new version asks again
- Join / leave checklists
- Letter templates with merge tags (offers, employment agreements)
- Announcements (audience + schedule)
- Calendar with public holidays set by HR

Time
- Leave: types, balances, half-day / multi-day, attachments, cancel/revoke; working days skip weekends & holidays; HR can apply on behalf
- Accrual, carry-forward, expiry, blackout dates (professional capabilities)
- Attendance: clock in/out, history, late report, manual attendance, timesheet / attendance matrix (employee × day)
- Rosters, shifts, overnight shifts, grace minutes, workplace boundary on clock-in, tardiness alerts, auto clock-out (professional)
- Claims with receipt + manager approval; overtime request + approval
- Replacement credit for weekend/holiday work → usable as leave after approval
- Manager approvals inbox for leave, attendance, claims, overtime, replacement credit; team history remains visible to the manager when escalated/handled upstream

Talent
- Recruitment: requisitions, candidate pipeline, offer letter, candidate accept/reject via link, signed agreement upload, confirm hire into draft employee + onboarding checklist (internal hiring desk, not a public jobs board)
- Performance: review cycles, templates, self-appraisal, manager review, KPI scores, goals
- Pulse surveys (templates, runs, results, employee link)
- Assets: register, categories, assign/return; employee sees what is assigned to them

Pay & record
- Pay groups, components, draft pay run → edit → submit → approve → lock
- Employee payslips
- Reports (workforce, leave, attendance, pay, etc.); scheduled email on higher entitlement
- Analytics with filters (higher entitlement)
- Audit log
- API keys, webhooks, outbound accounting connection (BukuCloud) where entitled

Who logs in
- Employee: own leave, time, documents, policies, payslip, assets, performance, pulse
- Manager: approvals inbox + team leave/attendance/documents/calendar/performance
- HR: organisation administration
- Branch admin / Director / Owner / Auditor exist — do not make billing or platform admin a slide

DO NOT CLAIM (not live / not for this deck)
- Full multi-step workflow builder / designer UI
- Public careers / jobs website
- Native App Store or Play Store mobile apps
- Built-in e-signature (candidate uploads a file signed elsewhere)
- SSO / SAML
- LMS / training academy
- WhatsApp bot, Bahasa UI as a sold feature, salary advance
- Face recognition as the default clock-in story (do not lead with selfie capture)
- Recognition feed, benefits catalogue, shift swap marketplace, birthday digests
- Pre-day-one candidate portal beyond offer acceptance
- Specific statutory acronym laundry lists unless the audience asks in the live demo (for MY sales conversation, keep slide language as “statutory-ready payroll & payslips”; put scheme detail in speaker notes only if the presenter wants it)

DEMO PATH (suggest on the demo slide)
If they name the pain, open that first. Otherwise:
1. Directory → one employee record
2. Leave request → manager Approvals inbox
3. Attendance matrix / roster → clock-in story
4. Performance cycle OR recruitment pipeline
5. Pay run → employee payslip
Stop there. Do not open every module.

WRITING RULES
- Prefer verbs and outcomes (“Managers clear leave in one inbox”) over nouns (“Leave module”)
- Max ~6 bullets per slide; prefer 3–4
- Speaker notes: 40–80 words; what to say + what not to promise
- Closing CTA: continue to live demo / discovery call — never a price

After you draft, self-check:
- Is every capability in PRODUCT TRUTH?
- Did any DO NOT CLAIM item sneak in?
- Is the product name Hirix HR everywhere (not BukuHR)?
- Are there zero prices?
Then deliver the final slide list.
```

---

## Short add-on (paste after the prompt if you want Gamma / Beautiful.ai)

```
Also produce a Gamma-ready outline: one slide = one card, with suggested layout (Title / Split / Timeline / Three columns). Keep the same Hirix HR brand colours.
```

## Short add-on (Malaysia payroll audience)

```
Audience is Malaysia. On the pay slide you may say: payslips, statutory reporting, and bank payout readiness — without listing every form code unless asked. Keep prices off the deck.
```

## Short add-on (Australia audience)

```
Audience is Australia. Keep payroll as pay runs + payslips + reports only. Do not name Malaysian statutory schemes. Do not claim award interpretation or STP filing.
```
