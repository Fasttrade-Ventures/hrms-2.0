# Offer letters, templates, and candidate email flow — design

**Date:** 11 Nov 2026  
**Status:** Approved (brainstorm)  
**Related:** [Recruitment enterprise desk](./2026-11-11-recruitment-enterprise-desk-design.md)  
**Product posture:** Internal hiring desk + **tokenized candidate response/upload pages** (not a public careers ATS). E-sign vendors deferred.

---

## 1. Summary

Extend recruitment so HR can:

1. Maintain **letter templates** (offer + employment agreement) with merge tags.
2. Create/edit **draft offers** from an offer template → PDF.
3. **Mark sent** → email candidate the offer PDF with **Accept / Reject** links.
4. Candidate **Reject** → offer declined + application rejected.
5. Candidate **Accept** → offer accepted → HR reviews/edits per-offer **agreement body**, then emails **employment agreement** + **secure upload** link.
6. Candidate uploads signed PDF → HR notified → HR **confirms hire** (draft employee + checklist).
7. Polish the **candidate detail** page layout.

Activation email remains manual after hire. DocuSign-style e-sign is explicitly out of scope for v1.

---

## 2. Decisions locked

| Topic | Choice |
|-------|--------|
| Template home | Shared HR area `/hr/letters` (offer + employment_agreement) |
| Template authoring | Simple body editor + merge tags |
| Email timing | On **Mark sent** (not on create) |
| Candidate decision | Accept / Reject via signed token links |
| Agreement when | After candidate accepts offer |
| Signing | Secure upload page (no e-sign vendor) |
| Hire timing | HR confirms hire after signed upload present |
| E-sign | Deferred follow-up |

---

## 3. Goals and non-goals

### Goals

1. Org-editable offer and employment agreement templates.
2. Offer create/edit draft from template; regenerate PDF.
3. Mark sent emails offer + Accept/Reject.
4. Accept → HR sends agreement (after optional per-offer body edit) + upload link; Reject → rejected.
5. Signed upload stored on offer (`signed_file_id`); HR hire gate.
6. Candidate detail UI that makes offer status and next actions obvious.

### Non-goals (v1)

- DocuSign / HelloSign / drawn signature widgets
- Word/PDF template upload
- Public careers / apply portal
- Auto-hire on upload
- Auto activation email
- Multi-signer workflows

---

## 4. Surfaces

| Route | Auth | Purpose |
|-------|------|---------|
| `/hr/letters` | HR admin / owner | Template list |
| `/hr/letters/new` | HR admin / owner | Create template |
| `/hr/letters/[id]/edit` | HR admin / owner | Edit / deactivate |
| Candidate detail (existing) | HR / owner / recruiter | Offer create/edit, Mark sent, Confirm hire |
| `/offer/respond/[token]` | Public (token) | Accept or reject offer |
| `/offer/sign/[token]` | Public (token) | Download agreement + upload signed PDF |

Nav: add **Letters** near Documents/Checklists for HR admin / owner (not recruiters unless product later expands).

---

## 5. Letter templates

### Data

Table `hr_letter_templates` (org-scoped):

- `id`, `organization_id`, `name`, `type` (`offer` | `employment_agreement`)
- `body` text (merge tags)
- `is_active` boolean
- `created_by`, `created_at`, `updated_at`

### Merge tags (v1)

`{{candidate_name}}`, `{{candidate_email}}`, `{{job_title}}`, `{{salary}}`, `{{currency}}`, `{{start_date}}`, `{{organization_name}}`, `{{requisition_title}}`, `{{offer_date}}`, `{{department}}`, `{{employment_type}}`, `{{work_location}}`, `{{company_email}}`, `{{company_phone}}`

Unknown tags left unchanged or stripped consistently (document in renderer: leave literal).

### PDF

Render merged plain-text lines via existing `buildSimplePdf` (same family as current offer PDF). Rich HTML later if needed.

### Roles

Create/edit/deactivate: `hr_administrator` | `organization_owner`.  
Recruiters: read active templates when creating offers (list active by type).

---

## 6. Offer lifecycle (updated)

Statuses remain: `draft` | `sent` | `accepted` | `declined` | `withdrawn`.

| Step | Actor | Result |
|------|-------|--------|
| Create | HR/recruiter | `draft`, `generated_file_id`, store `template_id` |
| Edit draft | HR/recruiter | Update fields; re-merge template; new PDF |
| Mark sent | HR/recruiter | `sent` + `sent_at`; email + response token |
| Candidate reject | Token | `declined`; application → `rejected` + history |
| Candidate accept | Token | `accepted` + `accepted_at`; snapshot `agreement_body` from template (no email yet) |
| Send agreement | HR/recruiter | Edit `agreement_body` while unlocked; generate PDF; email + sign token; set `agreement_sent_at` |
| Upload signed | Token | set `signed_file_id`; notify HR |
| Confirm hire | HR/recruiter | Existing hire path: draft employee + checklist; application → `hired` |

**Split from today’s `acceptOffer`:** candidate accept no longer creates the employee. **Confirm hire** (HR) does. UI may keep an HR override “Accept on behalf” only if needed; default path is candidate link. Spec default: **no HR Accept that creates employee without candidate accept**, except optional “Record accept offline” that sets `accepted` without email (still requires signed upload before hire, or allow hire with note — **v1: require `signed_file_id` before Confirm hire**).

Withdraw remains HR-side on draft/sent.

---

## 7. Tokens

Table `job_offer_tokens`:

- `id`, `organization_id`, `offer_id`, `purpose` (`respond` | `sign`)
- `token_hash` (store hash only), `expires_at`
- `used_at` nullable, `created_at`

Rules:

- Single-use for respond (accept or reject).
- Sign token: reusable until successful upload or expiry (or single-use after upload — prefer **invalidate on successful upload**).
- Expiry default: **14 days**.
- Public pages show friendly expired/used messages; no org data leakage beyond candidate’s own offer summary.

---

## 8. Email

Use Resend helpers in `packages/platform` (extend with offer/agreement builders), attachments as base64 PDF like existing attachment support.

1. **Offer sent:** subject + short body + Accept/Reject URLs + offer PDF attachment.  
2. **Agreement to sign:** agreement PDF + upload URL.  
3. **Signed received (HR):** notify org owner/HR mailbox or in-app banner on candidate detail; email to actor who sent offer if address known — **v1 minimum:** candidate detail shows “Signed PDF uploaded”; optional email to `MAIL_FROM` ops later. Prefer notify via existing notification outbox if a type fits; else set flag + success toast for next HR view.

Soft-fail: Mark sent still updates status if email fails, with clear error + **Resend offer email** action.

---

## 9. Candidate detail UI

- Header: name, stage, contact, source, requisition link.  
- Primary column: Offer panel (template pick, draft edit, PDF, Mark sent / Resend, status chips, Confirm hire when `accepted` + `signed_file_id`).  
- Secondary: compact stage Advance/Reject/Withdraw.  
- Full width: Timeline.  
- Show email/token state: Sent · Awaiting response · Accepted · Awaiting signature · Signed · Hired.

---

## 10. Success criteria

- [x] HR can CRUD active offer + employment_agreement templates with merge tags. (code on `feat/offer-letter-candidate-flow`; browser smoke pending)  
- [x] Create/edit draft offer from template generates PDF.  
- [x] Mark sent emails candidate with Accept/Reject; reject updates pipeline.  
- [x] Accept snapshots agreement; HR sends agreement + upload link; upload sets `signed_file_id`.  
- [x] Per-offer `letter_body` / `agreement_body` editable on candidate page before send.  
- [x] Confirm hire blocked without signed file; then draft employee + checklist.  
- [x] Candidate detail is clearer; tokens expire safely.  
- [x] No e-sign vendor; no careers portal.

Agent note: unit/tsc verified locally. Live Resend + migration apply + UI smoke not run in agent session.

---

## 11. Follow-ups

- E-sign vendor integration  
- Word template upload  
- HR “accept offline” without candidate click  
- Email HR on signed upload  
- Agreement regenerate / template version pinning  

---

## 12. Spec self-review

- No TBDs in success criteria.  
- Hire gate requires signed upload — matches user “HR changes status to hired” after sign.  
- Employee creation moved to Confirm hire — avoids double-hire vs old Accept.  
- Attachments require `RESEND_API_KEY` + `MAIL_FROM` (existing platform constraint).  
