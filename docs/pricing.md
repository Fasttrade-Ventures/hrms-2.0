# BukuHR pricing and packages

**Locked:** 6 Oct 2026  
**Brand:** BukuHR  
**Prices:** before 8% SST

SaaS and standalone use the same three packages. They are sold differently. The public marketing site sells SaaS. Standalone is a quote, not a second price table on the homepage.

SaaS is paid with Stripe, in MYR, card checkout. Standalone is an invoice. Billplz is not the SaaS provider.

Owner checkout creates a Stripe Checkout Session for the invoice total (`/owner/billing`, `apps/web/src/lib/billing/stripe.ts`). Plan amounts in `apps/web/src/lib/billing/plans.ts` match the table below. The older Billplz webhook stays only so bills already issued can still complete.

---

## What each package includes

People, leave, attendance, and one-step approvals are in every package. These are not in any package yet: multi-level approvals, the workflow builder, SSO, Bahasa, WhatsApp, native apps, zakat, e-signature, and salary advance.

| | Core | Professional | Enterprise |
|---|---|---|---|
| People, leave, attendance, one-step approvals | Yes | Yes | Yes |
| Policies, probation, onboarding and offboarding checklists | Yes | Yes | Yes |
| Announcements, calendar, documents | Yes | Yes | Yes |
| Payroll, payslips, EA / CP8D | | Yes | Yes |
| Overtime, claims, replacement credit | | Yes | Yes |
| GPS clock-in | | Yes | Yes |
| Assets | | Yes | Yes |
| Performance and KPIs | | Yes | Yes |
| Bulk import | | Yes | Yes |
| Recruitment | | | Yes |
| Analytics | | | Yes |
| Audit log | | | Yes |
| API, webhooks, BukuCloud | | | Yes |
| Bank payouts | | | Yes |

Module gates in code: `packages/platform/src/entitlements/types.ts`.

---

## SaaS

Shared hosting. The customer signs up online and pays with Stripe. 14-day trial. Monthly or yearly. The first 10 employees are in the base price. Yearly is 10 months of the monthly base (2 months free). Extra employees are billed per person per month. Add 8% SST on the Stripe charge.

| Plan | Monthly | Each extra employee / month | Yearly |
|---|---|---|---|
| Core | RM 69 | RM 6 | RM 690 |
| Professional | RM 249 | RM 18 | RM 2,490 |
| Enterprise | RM 449 | RM 29 | RM 4,490 |

Monthly total before SST:

```
base(tier) + max(0, active employees - 10) × extra rate(tier)
```

Examples before SST:

| Staff | Core | Professional | Enterprise |
|---|---|---|---|
| 10 | RM 69 | RM 249 | RM 449 |
| 20 | RM 129 | RM 429 | RM 739 |
| 50 | RM 309 | RM 969 | RM 1,609 |

Sen for the billing seed, when it is updated: Core `6900 / 69000 / 600`, Professional `24900 / 249000 / 1800`, Enterprise `44900 / 449000 / 2900`. Included headcount stays 10.

---

## Standalone

Same packages. The client gets their own servers and pays by invoice. Setup is RM 5,000 once, and it is not discounted.

The license is per active employee per year, and never below the minimum for that package. Two years take 10% off the license for the full term. Three years take 20% off. Pay the license upfront.

| Plan | Per employee / year | Minimum / year |
|---|---|---|
| Core | RM 90 | RM 6,000 |
| Professional | RM 180 | RM 12,000 |
| Enterprise | RM 240 | RM 18,000 |

```
annual license = max(minimum, per employee × staff count)
term license = annual license × years × term factor
term factor = 1.00 for 1 year, 0.90 for 2 years, 0.80 for 3 years
pay now = term license + 5,000 setup
```

Fifty staff on Professional is RM 12,000 a year. Core at 50 staff is RM 6,000. Enterprise at 50 staff is RM 18,000.

Set `organizations.licensed_headcount` to the staff count on the quote. Empty means unlimited, which is only for demos.

---

## Marketing site

Do not build it in this repo yet. When it starts, it lives in its own folder in the marketing workspace. English only.

The homepage sells SaaS: three cards and a trial button. Standalone is one link under the cards, “Own servers and an invoice,” to a separate quote page. That page asks for staff count, package, and 1, 2, or 3 years. It does not sit beside the SaaS cards.
